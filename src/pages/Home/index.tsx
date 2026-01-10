import "./index.scss";
import React, { useEffect, useState, useRef } from "react";
import config from "@/config/config";
import abi from "@/Contract/ABI/abi";
import { ethers } from "ethers";
import { Input, Button, Space, Radio } from "antd-mobile";
import CycleBuy from "@/components/cycleBuy";
import Redeem from "@/components/redeem";
import Form from "@/components/Form";
import configPlus from "@/config/configPlus";
import type { ConfigPlus } from "@/ts/configPlus";
const Home: React.FC = () => {
  const provider = new ethers.JsonRpcProvider(
    "https://rpc.juchain.org",
    210000
  );
  const [configPlusList, setConfigPlusList] = useState<ConfigPlus>(configPlus);
  const stakeAddress = "0x2f3b94fa48109809F87AE190167027a86888250A"; //合约地址
  const initInviter = "0xbb0516b107ed130a5b6cd00aedeeeb950716f384"; //初始邀请人
  function getConfigValue(field: string) {
    return configPlusList.find((i) => i.field === field)?.value;
  }
  useEffect(() => {}, []);
  return (
    <div className="home-page-box">
      <div>
        <h1 className="Title">高斯机器人</h1>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Form
            configPlusList={configPlusList}
            setConfigPlusList={setConfigPlusList}
          ></Form>
          {getConfigValue("robotType") == 0 && (
            <CycleBuy
              configPlusList={configPlusList}
              setConfigPlusList={setConfigPlusList}
            ></CycleBuy>
          )}
          {getConfigValue("robotType") == 1 && (
            <Redeem
              configPlusList={configPlusList}
              setConfigPlusList={setConfigPlusList}
            ></Redeem>
          )}
        </Space>
      </div>
    </div>
  );
};
export default Home;
