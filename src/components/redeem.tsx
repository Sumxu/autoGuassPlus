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
  /**************** 公共工具 ****************/

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
    if (Array.isArray(input)) return input;
    if (!input) return [];
    return input
      .trim()
      .split(/[\s,，]+/)
      .filter(Boolean);
  }

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

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
  const checkRedeemConfig = (): boolean => {
    const type = Number(getConfigValue("redemType")) as 0 | 1;
    const min = Number(getConfigValue("redemMinSec"));
    const max = Number(getConfigValue("redemMaxSec"));
    if (stringToArray(getConfigValue("walletsInputs")).length == 0) {
      appendLog("❌ 私钥列表不能为空");
      return false;
    }
    // 基础合法性
    if (isNaN(min) || isNaN(max)) {
      appendLog("❌ 赎回时间配置必须是数字");
      return false;
    }

    if (min < 0 || max < 0) {
      appendLog("❌ 赎回时间不能为负数");
      return false;
    }

    // ⭐ 关键条件：type = 1 必须 ≤ 60
    if (type === 1) {
      if (min > 60 || max > 60) {
        appendLog("❌ 赎回间隔类型为每分钟的时候，秒数必须在 0~60 之间");
        return false;
      }
    }

    // 区间合法
    if (min > max) {
      appendLog("❌ 赎回时间最小值 不能大于 赎回时间最大值");
      return false;
    }

    return true;
  };
  /**************** 核心入口 ****************/
  const startUp = async () => {
    if (runningRef.current) return;
    // 🔒 启动前必要条件校验
    if (!checkRedeemConfig()) {
      return;
    }
    runningRef.current = true;
    setStartupLoading(true);
    appendLog("🚀 开始赎回任务");

    const wallets = stringToArray(getConfigValue("walletsInputs"));

    for (let i = 0; i < wallets.length; i++) {
      if (!runningRef.current) break;

      wallet = new Wallet(wallets[i], provider);
      contract = new Contract(stakeAddress, abi, wallet);
      address = wallet.address;

      appendLog(`👛 开始处理钱包 ${address}`);

      try {
        const userIds = await contract.userIdsLength(address);
        appendLog(`查询 ${address} stake 数量: ${userIds}`);

        if (Number(userIds) > 0) {
          await handleOneWallet(Number(userIds));
        } else {
          appendLog(`${address} 没有 stake`);
        }
      } catch (e) {
        console.log("w=e", e);

        appendLog(`❌ ${address} 查询失败`, e);
      }

      appendLog(`✅ 钱包 ${address} 处理完成`);
    }

    appendLog("🎉 所有钱包执行完毕");
    runningRef.current = false;
    setStartupLoading(false);
  };

  /**************** 单钱包完整流程 ****************/

  const handleOneWallet = async (userIds: number) => {
    if (!runningRef.current) return;

    /** 1️⃣ 获取 holdIds */
    const idCalls = Array.from({ length: userIds }).map((_, index) => ({
      contractAddress: stakeAddress,
      abi,
      params: [address, index],
    }));

    const idResult = await fetch("userHoldIds", idCalls);
    console.log("idResult==", idResult);
    if (!idResult.success || !runningRef.current) return;

    const holdIds = idResult.data;
    console.log("holdIds==", holdIds);

    /** 2️⃣ 获取 stakeInfo */
    const infoCalls = holdIds.map((id) => ({
      contractAddress: stakeAddress,
      abi,
      params: [id],
    }));

    const infoResult = await fetch("stakeInfo", infoCalls);
    console.log("infoResult==", infoResult);
    if (!infoResult.success || !runningRef.current) return;
    /** 3️⃣ 顺序赎回 */
    await redeemAll(holdIds, infoResult.data);
  };

  /**************** 顺序赎回 stake ****************/

  const redeemAll = async (holdIds: any[], stakeInfos: any[]) => {
    for (let i = 0; i < holdIds.length; i++) {
      if (!runningRef.current) break;
      const stakeInfo = stakeInfos[i];
      const expiredAt = Number(stakeInfo[6]) * 1000;
      const isExpired = Date.now() > expiredAt;
      if (!isExpired) {
        appendLog(`${address} stake ${holdIds[i]} 未到赎回时间`);
        continue;
      }
      await withdrawOnce(holdIds[i]);
      await sleepByConfig();
    }

    appendLog(`${address} 所有 stake 已处理完成`);
  };

  /**************** 单次赎回 ****************/

  const withdrawOnce = async (stakeId: any) => {
    if (!runningRef.current) return;

    try {
      const tx = await contract.withdraw(stakeId);
      await tx.wait();
      appendLog(`✅ ${address} 赎回成功 stakeId=${stakeId}`);
    } catch (e) {
      appendLog(`❌ ${address} 赎回失败 stakeId=${stakeId}`, e);
    }
  };

  /**************** 间隔控制 ****************/

  const sleepByConfig = async () => {
    const sec = getRandomInRangeInclude(
      Number(getConfigValue("redemMinSec")),
      Number(getConfigValue("redemMaxSec")),
      Number(getConfigValue("redemType")) as 0 | 1
    );

    let delay = 0;

    if (getConfigValue("redemType") == 0) {
      delay = sec * 1000;
    } else {
      const next = new Date();
      next.setMinutes(next.getMinutes() + 1);
      next.setSeconds(sec);
      delay = next.getTime() - Date.now();
    }

    appendLog(`⏱ 等待 ${delay}ms`);
    await sleep(delay);
  };

  /**************** 停止 ****************/

  const closeConfig = () => {
    runningRef.current = false;
    setStartupLoading(false);
    appendLog("🛑 已停止赎回任务");
  };

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
