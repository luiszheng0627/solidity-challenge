const ZLEthPool = artifacts.require("ZLEthPool");

contract("ZLEthPool Unit test", function (accounts) {
  const team = accounts[0];
  const userA = accounts[1];
  const userB = accounts[2];

  advanceTime = (time) => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [time],
      }, (err, result) => {
        if (err) {
          return reject(err)
        }
        return resolve(result)
      })
    })
  }

  advanceBlock = () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
      }, (err) => {
        if (err) {
          return reject(err)
        }
        const newBlockHash = web3.eth.getBlock('latest').hash

        return resolve(newBlockHash)
      })
    })
  }

  advanceTimeAndBlock = async (time) => {
    await advanceTime(time)
    await advanceBlock()
    return Promise.resolve(web3.eth.getBlock('latest'))
  }

  it("Case1", async function () {
    const contract = await ZLEthPool.deployed();

    await contract.deposit({from: userA, value: web3.utils.toWei('1', 'ether')});
    await advanceTimeAndBlock(45);

    await contract.deposit({from: userB, value: web3.utils.toWei('3', 'ether')});
    await advanceTimeAndBlock(45);

    await contract.deposit({from: team, value: web3.utils.toWei('2', 'ether')});
    await advanceTimeAndBlock(60 * 60 * 24 * 7);

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

    await contract.clearPool();
  });


  it("Case2", async function () {
    const contract = await ZLEthPool.deployed();

    await contract.deposit({from: userA, value: web3.utils.toWei('1', 'ether')});
    await advanceTimeAndBlock(45);

    await contract.deposit({from: team, value: web3.utils.toWei('2', 'ether')});
    await advanceTimeAndBlock(45);

    await contract.deposit({from: userB, value: web3.utils.toWei('3', 'ether')});

    await advanceTimeAndBlock(60 * 60 * 24 * 7);
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
