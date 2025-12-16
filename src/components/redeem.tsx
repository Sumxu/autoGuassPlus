import "@/pages/Home/index.scss";
import React, { useState, useImperativeHandle, forwardRef } from "react";
import abi from "@/Contract/ABI/abi";
import { ethers, Wallet, Contract } from "ethers";
import { useNFTMulticall } from "@/Hooks/useNFTTokensByOwner";

interface RedeemProps {
  privateKeyList: string[];
}

const Redeem = forwardRef(({ privateKeyList }: RedeemProps, ref) => {
  const stakeAddress = "0x2f3b94fa48109809F87AE190167027a86888250A";
    const provider = new ethers.JsonRpcProvider(
      "https://rpc.juchain.org",
      210000
    );
   

  const { fetch } = useNFTMulticall();
  const [logs, setLogs] = useState<string[]>([]);

  const appendLog = (...msg: any[]) => {
    const text = msg
      .map((m) => (typeof m === "object" ? JSON.stringify(m) : m))
      .join(" ");
    setLogs((prev) => [text, ...prev]);
  };

  // 核心赎回方法
  const startUp = async () => {
    for (let i = 0; i < privateKeyList.length; i++) {
      const wallet = new Wallet(privateKeyList[i], provider);
      const contract = new Contract(stakeAddress, abi, wallet);
      const userIds = await contract.userIdsLength(wallet.address);
      const address = wallet.address;
      appendLog(`查询${address}钱包地址长度为`, userIds);
      if (userIds > 0) {
        getIdByIndex(userIds, wallet.address, contract);
      }
    }
  };

  const getIdByIndex = async (
    userIds: number,
    address: string,
    contract: Contract
  ) => {
    const calls = Array.from({ length: Number(userIds) }).map((_, index) => ({
      contractAddress: stakeAddress,
      abi: abi,
      params: [address, index],
    }));
    appendLog(`查询${address}钱包地址stakeId`);
    fetch("userHoldIds", calls).then(async (result) => {
      if (result.success) {
        const holdIds = result.data;  
        appendLog(`查询结束${address}数量为`, holdIds?.length);
         fetchStakeInfo(holdIds, address, contract);
      }
    });
  };
  const fetchStakeInfo = (holdIds, address, contract) => {
    const calls = Array.from({ length: Number(holdIds.length) }).map(
      (_, index) => ({
        contractAddress: stakeAddress,
        abi: abi,
        params: [holdIds[index]],
      })
    );
    fetch("stakeInfo", calls).then(async (result) => {
      if (result.success) {
        const stakeInfos = result.data;
        for (let i = 0; i < stakeInfos.length; i++) {
          const stakeInfo = stakeInfos[i];
          const now = Date.now();
          const isExpired = now > Number(stakeInfo[5]) * 1000;
          if (isExpired) {
            await withdrawFn(holdIds[i], contract);
            appendLog(`${address}赎回成功`);
          } else {
            appendLog(`${address}未超过赎回时间`);
          }
        }
      }
    });
  };
  const withdrawFn = async (
    holdId: number,
    contract: Contract,
  ) => {
    const tx = await contract.withdraw(holdId);
    await tx.wait();
  };

  // 暴露 startUp 给父组件
  useImperativeHandle(ref, () => ({
    startUp,
  }));

  return (
    <div className="home-page-box">
      <h3>赎回运行日志</h3>
      <div className="log-content" id="logBox">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
});

export default Redeem;
