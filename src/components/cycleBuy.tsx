import "@/pages/Home/index.scss";
import React, { useEffect, useState } from "react";
import config from "@/config/config";
import abi from "@/Contract/ABI/abi";
import { ethers } from "ethers";
import { Input, Button, Space, Radio, Toast } from "antd-mobile";
interface CycleBuyProps {
  onDataChange: (data: any) => void;
  redeemChange: (data: any) => void;
}

const CycleBuy: React.FC<CycleBuyProps> = ({ onDataChange, redeemChange }) => {
  const provider = new ethers.JsonRpcProvider(
    "https://rpc.juchain.org",
    210000
  );

  const stakeAddress = "0x2f3b94fa48109809F87AE190167027a86888250A"; //合约地址
  const runningRef = React.useRef(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  //动态绑定配置项
  const [configObject, setConfigObject] = useState<any>(config);
  const [privateKeyList, setPrivateKeyList] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [startupLoading, setStartupLoading] = useState<boolean>(false);
  // 封装日志方法
  const appendLog = (...msg: any[]) => {
    const text = msg
      .map((m) => (typeof m === "object" ? JSON.stringify(m) : m))
      .join(" ");
    // 最新日志放在最前面
    setLogs((prev) => [text, ...prev]);
  };

  // 更新字段
  const updateField = (key: string, value: string) => {
    setConfigObject((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  // 更新钱包
  const updateWallet = (index: number, value: string) => {
    console.log("value==", value);
    try {
      // 1️⃣ 校验私钥（非法直接跳出）
      // 3️⃣ 更新私钥列表
      setPrivateKeyList((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    } catch {
      // 私钥非法，什么都不做 or 给提示
      return Toast.show("请粘贴正确的私钥");
    }

    const newWallets = [...configObject.wallets];
    newWallets[index] = value;
    setConfigObject((prev) => ({ ...prev, wallets: newWallets }));
  };

  // 新增钱包
  const addWallet = () => {
    setConfigObject((prev) => ({
      ...prev,
      wallets: [...prev.wallets, ""],
    }));
    setPrivateKeyList((prev) => [...prev, ""]);
  };

  const handleUpdateConfig = async () => {
    if (runningRef.current) return;

    runningRef.current = true;
    setStartupLoading(true);

    startup();
  };
  const closeConfig = () => {
    runningRef.current = false;
    setStartupLoading(false);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    appendLog("🛑 已停止抢购");
  };
  async function bind(nextId) {
    const wallet = new ethers.Wallet(configObject.wallets[nextId], provider);
    const contract = new ethers.Contract(stakeAddress, abi, wallet);
    const userInfoData = await contract.userInfo(wallet.address);
    if (userInfoData[0] === "0x0000000000000000000000000000000000000000") {
      const tx = await contract.bind(configObject.initInviter);
      await tx.wait();
      console.log("授权成功", wallet.address);
    }
  }
  async function cycleBuy(nextId: number) {
    // ❗ 第一行就判断
    if (!runningRef.current) {
      appendLog("cycleBuy 已终止");
      return;
    }
    if (nextId >= configObject.wallets.length) {
      nextId = 0;
    }
    const wallet = new ethers.Wallet(configObject.wallets[nextId], provider);
    const contract = new ethers.Contract(stakeAddress, abi, wallet);

    try {
      let maxStakeAmount = await contract.maxStakeAmount();
      if (!runningRef.current) return;

      if (maxStakeAmount > configObject.maxAmount) {
        maxStakeAmount = configObject.maxAmount;
      }
      if (maxStakeAmount >= configObject.minAmount) {
        const amount =
          Math.random() *
            (configObject.maxAmount > maxStakeAmount
              ? maxStakeAmount
              : configObject.maxAmount - configObject.minAmount) +
          configObject.minAmount;
        const depositAmount = Number(amount).toFixed(0);
        const walletBalance = await provider.getBalance(wallet.address);
        const amountsJuIn = await contract.getAmountsJuIn(
          ethers.parseEther(depositAmount)
        );
        console.log("amountsJuIn==", amountsJuIn.toString());
        if (walletBalance > amountsJuIn) {
          const curr = new Date();
          console.log(
            "符合购买条件",
            wallet.address,
            curr.getHours() + ":" + curr.getMinutes() + ":" + curr.getSeconds()
          );

          const depositTx = await contract.deposit(
            configObject.days,
            ethers.parseEther(depositAmount),
            { value: amountsJuIn }
          );
          await depositTx.wait();
          appendLog("✅ 抢购成功", wallet.address);
        } else {
          appendLog(
            "WARN 钱包地址余额不足:  钱包: %s 余额: %s 需要JU: %s",
            wallet.address,
            walletBalance,
            amountsJuIn
          );
        }
        nextId++;
      }
    } catch (e) {
      console.log("e----", e);
      appendLog("❌ 抢购失败", e);
    }
    // ⏱️ 下一次执行
    let delay = 0;
    if (configObject.type == 0) {
      delay = configObject.sec * 1000;
    } else {
      const nextTime = new Date();
      nextTime.setMinutes(new Date().getMinutes() + 1);
      nextTime.setSeconds(configObject.sec);
      delay = nextTime.getTime() - Date.now();
    }
    timerRef.current = setTimeout(() => {
      cycleBuy(nextId);
    }, delay);
  }
  async function startup() {
    appendLog("Startup 地址绑定检查开始");
    for (let i = 0; i < configObject.wallets.length; i++) {
      await bind(i);
    }
    appendLog("Startup   地址绑定检查结束");
    cycleBuy(0);
  }
  useEffect(() => {
    onDataChange(privateKeyList);
  }, [privateKeyList]);
  return (
    <div className="home-page-box">
      <div style={{ padding: 8 }}>
        <h3>天数(0/1/2 表示 1天/15天/30天 )</h3>
        <Input
          value={configObject.days}
          onChange={(v) => updateField("days", v)}
          placeholder="请输入天数"
        />
        <h3>最小投入金额</h3>
        <Input
          value={configObject.minAmount}
          onChange={(v) => updateField("minAmount", v)}
          placeholder="最小投入金额"
        />
        <h3>最大投入金额</h3>
        <Input
          value={configObject.maxAmount}
          onChange={(v) => updateField("maxAmount", v)}
          placeholder="最大投入金额"
        />
        <h3>间隔类型</h3>
        <div className="boxCenter">
          <Radio
            className="boxRadio"
            checked={configObject.type == 0}
            onClick={() => updateField("type", 0)}
          >
            间隔多少秒
          </Radio>
          <Radio
            checked={configObject.type == 1}
            onClick={() => updateField("type", 1)}
          >
            每分钟中的第几秒
          </Radio>
        </div>
        <h3>{configObject.type == 0 ? "间隔多少秒" : "每分钟中的第几秒"}</h3>
        <Input
          value={configObject.sec}
          onChange={(v) => updateField("sec", v)}
          placeholder="请输入"
        />

        <h3>绑定邀请人</h3>
        <Input
          value={configObject.initInviter}
          onChange={(v) => updateField("initInviter", v)}
          placeholder="请输入绑定邀请人"
        />
        <h4>私钥列表</h4>
        {configObject.wallets.map((w, idx) => (
          <Space key={idx} align="center" style={{ width: "100%" }}>
            <Input
              value={w}
              onChange={(v) => updateWallet(idx, v)}
              placeholder={`私钥列表 ${idx + 1}`}
              className="inputWalletsOption"
            />
            <Button
              color="danger"
              size="small"
              className="delBtn"
              onClick={() => {
                const newWallets = configObject.wallets.filter(
                  (_, index) => index !== idx
                );
                setConfigObject((prev) => ({
                  ...prev,
                  wallets: newWallets,
                }));
              }}
            >
              删除
            </Button>
          </Space>
        ))}
        <Button color="primary" onClick={addWallet}>
          + 新增私钥
        </Button>
        <div className="fixedBottom">
          <Button
            color="success"
            className="fixedBottomBtn"
            loading={startupLoading}
            onClick={handleUpdateConfig}
            style={{ marginTop: 16 }}
          >
            开始运行抢购
          </Button>

          <Button
            color="success"
            className="fixedBottomBtn"
            onClick={closeConfig}
            style={{ marginTop: 16 }}
          >
            停止抢购
          </Button>

          <Button
            color="success"
            className="fixedBottomBtn"
            onClick={redeemChange}
            style={{ marginTop: 16 }}
          >
            开始赎回
          </Button>
        </div>
      </div>
      <h3>私钥运行日志</h3>
      <div className="log-content" id="logBox">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
};
export default CycleBuy;
