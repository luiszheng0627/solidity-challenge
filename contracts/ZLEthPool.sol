//SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0 < 0.9.0;

contract ZLEthPool {
    address public team;

    uint public reward;
    uint public rewardAddedAt;

    uint public depositsBeforeReward;
    mapping(address => uint) public userDeposits;
    mapping(address => uint) public userDepositedAt;
    uint public countDeposits;
    uint public countWithdraws;

    constructor() {
        team = msg.sender;
        reward = 0;
        rewardAddedAt = 0;
    }

    function deposit() payable external {
        require(msg.value > 0, 'Insufficient amount');

        if (msg.sender == team) {
            require(reward == 0 && rewardAddedAt == 0, 'Still not complete previous round');
            reward = msg.value;
            rewardAddedAt = block.timestamp;
        } else {
            userDeposits[msg.sender] += msg.value;
            userDepositedAt[msg.sender] = block.timestamp;
            countDeposits++;

            if (reward == 0 && rewardAddedAt == 0) {
                depositsBeforeReward += msg.value;
            }
        }
    }

    function calcReward(address user) view public returns (uint userReward)  {
        require(reward > 0 && rewardAddedAt > 0, 'Still no reward by team.');
        require(depositsBeforeReward > 0 && countDeposits > countWithdraws, 'No body deposit!');

        uint userDeposit = userDeposits[user];
        require(userDeposit > 0, 'No your deposit');

        userReward = 0;
        if (userDepositedAt[user] < rewardAddedAt) {
            uint diff = block.timestamp - userDepositedAt[msg.sender];
            if (diff > 12 seconds) {
                if (diff > 1 weeks) diff = 1 weeks;
                // TODO: We can apply more interesting reward calc model.
                userReward = ((userDeposit * reward * diff) / depositsBeforeReward) / 1 weeks;
            }
        }
    }

    function withdraw() external {
        require(msg.sender != team, 'Invalid withdraw user');

        uint userAmount = userDeposits[msg.sender] + calcReward(msg.sender);

        userDeposits[msg.sender] = 0;
        userDepositedAt[msg.sender] = 0;
        _sendBalance(msg.sender, userAmount);

        countWithdraws++;
        if (countDeposits <= countWithdraws) {
            reward = 0;
            rewardAddedAt = 0;

            depositsBeforeReward = 0;
            countDeposits = 0;
            countWithdraws = 0;
        }
    }

    function clearPool() external {
        require(msg.sender == team && depositsBeforeReward == 0);

        uint balance = address(this).balance;
        if (balance > 0) {
            _sendBalance(team, balance);
        }
    }

    function _sendBalance(address to, uint amount) private {
        (bool success,) = payable(to).call{value: amount}("");
        require(success);
    }
}
