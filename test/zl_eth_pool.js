const ZLEthPool = artifacts.require("ZLEthPool");

const _1WEEK = 60 * 60 * 24 * 7

contract("ZLEthPool Unit test", function (accounts) {
  const team = accounts[0];
  const userA = accounts[1];
  const userB = accounts[2];

  advanceTime = (time) => new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [time],
      },
      (err, result) => err ? reject(err) : resolve(result)
    )
  })

  advanceBlock = () => new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_mine',
      },
      (err, result) => err ? reject(err) : resolve(result)
    )
  })

  advanceTimeAndBlock = async (time) => await Promise.all([
    advanceTime(time),
    advanceBlock()
  ]).then(() => web3.eth.getBlock('latest'))

  it("Case1", async function () {
    const contract = await ZLEthPool.deployed();

    await contract.deposit({from: userA, value: web3.utils.toWei('1', 'ether')});
    await advanceTimeAndBlock(45);

    await contract.deposit({from: userB, value: web3.utils.toWei('3', 'ether')});
    await advanceTimeAndBlock(45);

    await contract.deposit({from: team, value: web3.utils.toWei('2', 'ether')});
    await advanceTimeAndBlock(_1WEEK);

    const [rewardA, rewardB] = await Promise.all([
      contract.calcReward(userA),
      contract.calcReward(userB),
    ])

    assert.isTrue(
      web3.utils.fromWei(rewardA, 'ether') === '0.5' &&
      web3.utils.fromWei(rewardB, 'ether') === '1.5'
    );

    await Promise.all([
      contract.withdraw({from: userA}),
      contract.withdraw({from: userB}),
    ]);

    await contract.clearPool({from: team});
  });


  it("Case2", async function () {
    const contract = await ZLEthPool.deployed();

    await contract.deposit({from: userA, value: web3.utils.toWei('1', 'ether')});
    await advanceTimeAndBlock(45);

    await contract.deposit({from: team, value: web3.utils.toWei('2', 'ether')});
    await advanceTimeAndBlock(45);

    await contract.deposit({from: userB, value: web3.utils.toWei('3', 'ether')});
    await advanceTimeAndBlock(_1WEEK);

    const [rewardA, rewardB] = await Promise.all([
      contract.calcReward(userA),
      contract.calcReward(userB),
    ])

    assert.isTrue(
      web3.utils.fromWei(rewardA, 'ether') === '2' &&
      web3.utils.fromWei(rewardB, 'ether') === '0'
    );

    await Promise.all([
      contract.withdraw({from: userA}),
      contract.withdraw({from: userB}),
    ]);

    await contract.clearPool({from: team});
  });
});
