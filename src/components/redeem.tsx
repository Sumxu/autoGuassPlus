import "@/pages/Home/index.scss";
import React, { useState, useImperativeHandle, forwardRef } from "react";
import abi from "@/Contract/ABI/abi";
import { ethers, Wallet, Contract } from "ethers";
import { useNFTMulticall } from "@/Hooks/useNFTTokensByOwner";
import type { ConfigPlus } from "@/ts/configPlus";
import { Button, Dialog, Toast } from "antd-mobile";

interface RedeemProps {
  configPlusList: ConfigPlus;
  setConfigPlusList: React.Dispatch<React.SetStateAction<ConfigPlus>>;
}
const Redeem: React.FC<RedeemProps> = ({
  configPlusList,
  setConfigPlusList,
}) => {
  const stakeAddress = "0x2f3b94fa48109809F87AE190167027a86888250A";
  const provider = new ethers.JsonRpcProvider(
    "https://rpc.juchain.org",
    210000
  );
  const { fetch } = useNFTMulticall();
  const [logs, setLogs] = useState<string[]>([]);
  const [startupLoading, setStartupLoading] = useState<boolean>(false);
  const runningRef = React.useRef(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  let wallet = null;
  let contract = null;
  let address = null;
  const appendLog = (...msg: any[]) => {
    const text = msg
      .map((m) => (typeof m === "object" ? JSON.stringify(m) : m))
      .join(" ");
    setLogs((prev) => [text, ...prev]);
  };
  function getConfigValue(field: string) {
    return configPlusList.find((i) => i.field === field)?.value;
  }
  function stringToArray(input: string | string[]): string[] {
    // 如果已经是数组，直接返回
    if (Array.isArray(input)) return input;
    if (!input) return [];
    return (
      input
        .trim()
        // 按 空格 / 逗号 / 中文逗号 拆分
        .split(/[\s,，]+/)
        .filter(Boolean)
    );
  }
  // 核心赎回方法
  const startUp = async () => {
    if (runningRef.current) return;

    runningRef.current = true;
    setStartupLoading(true);
    appendLog("🚀 开始赎回任务");

    let wallets = stringToArray(getConfigValue("walletsInputs"));
    if (!Array.isArray(wallets)) return;

    for (let i = 0; i < wallets.length; i++) {
      if (!runningRef.current) return;

      wallet = new Wallet(wallets[i], provider);
      contract = new Contract(stakeAddress, abi, wallet);
      address = wallet.address;

      const userIds = await contract.userIdsLength(address);
      appendLog(`查询 ${address} stake 数量`, userIds);
      if (userIds > 0) {
        await getIdByIndex(userIds);
      }else{
        appendLog(`结束查询 ${address}`);
        closeConfig()
      }
    }
  };
  const getIdByIndex = async (userIds: number) => {
    if (!runningRef.current) return;

    const calls = Array.from({ length: Number(userIds) }).map((_, index) => ({
      contractAddress: stakeAddress,
      abi,
      params: [address, index],
    }));

    fetch("userHoldIds", calls).then((result) => {
      if (result.success && runningRef.current) {
        fetchStakeInfo(result.data);
      }
    });
  };

  const fetchStakeInfo = (holdIds: any[]) => {
    if (!runningRef.current) return;

    const calls = holdIds.map((id) => ({
      contractAddress: stakeAddress,
      abi,
      params: [id],
    }));

    fetch("stakeInfo", calls).then((result) => {
      if (result.success && runningRef.current) {
        redeemFn(0, holdIds, result.data);
      }
    });
  };
  const redeemFn = async (
    nextId: number, 
    holdIds: any[],
    stakeInfos: any[]
  ) => {
    if (!runningRef.current) {
      appendLog("🛑 赎回流程已中断");
      return;
    }

    if (nextId >= holdIds.length) {
      appendLog(`${address} 所有 stake 已处理完成`);
      closeConfig()
      return;
    }

    const stakeInfo = stakeInfos[nextId];
    const now = Date.now();
    const isExpired = now > Number(stakeInfo[6]) * 1000;

    if (isExpired) {
      await withdrawFn(nextId, holdIds, stakeInfos);
    } else {
      appendLog(`${address} stake ${holdIds[nextId]} 未到期`);
      redeemFn(nextId + 1, holdIds, stakeInfos);
    }
  };
  const withdrawFn = async (
    nextId: number,
    holdIds: any[],
    stakeInfos: any[]
  ) => {
    if (!runningRef.current) return;
    const tx = await contract.withdraw(holdIds[nextId]);
    await tx.wait();
    appendLog(`${address} 赎回成功 stakeId=${holdIds[nextId]}`);
    const sec = getRandomInRangeInclude(
      Number(getConfigValue("redemMinSec")),
      Number(getConfigValue("redemMaxSec")),
      Number(getConfigValue("redemType")) as 0 | 1
    );

    let delay = 0;
    if (getConfigValue("redemType") == 0) {
      delay = sec * 1000;
    } else {
      const nextTime = new Date();
      nextTime.setMinutes(nextTime.getMinutes() + 1);
      nextTime.setSeconds(sec);
      delay = nextTime.getTime() - Date.now();
    }
    appendLog(`⏱ 下一次执行 ${delay}ms 后`);
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      redeemFn(nextId + 1, holdIds, stakeInfos);
    }, delay);
  };

  const closeConfig = () => {
    runningRef.current = false;
    setStartupLoading(false);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    appendLog("🛑 已停止赎回任务");
  };
  function getRandomInRangeInclude(
    v1: number,
    v2: number,
    type: 0 | 1
  ): number {
    let min = Math.max(0, Math.floor(Math.min(v1, v2)));
    let max = Math.max(0, Math.floor(Math.max(v1, v2)));

    if (type === 1) {
      min = Math.min(min, 60);
      max = Math.min(max, 60);
    }

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return (
    <div className="fixedBottom">
      <Button
        color="success"
        className="fixedBottomBtn"
        loading={startupLoading}
        onClick={startUp}
        style={{ marginTop: 16 }}
      >
        开始运行赎回
      </Button>

      <Button
        color="success"
        className="fixedBottomBtn"
        onClick={closeConfig}
        style={{ marginTop: 16 }}
      >
        停止赎回
      </Button>
      <div className="logBox">
        <div className="title">赎回运行日志</div>
        <Button
          className="delBtn"
          onClick={() =>
            Dialog.confirm({
              content: "是否清空日志",
              onConfirm: async () => {
                setLogs([]);
                Toast.show({
                  icon: "success",
                  content: "清空成功",
                  position: "bottom",
                });
              },
            })
          }
        >
          清空日志
        </Button>
      </div>
      <div className="log-content" id="logBox">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
};

export default Redeem;
