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
  const [configPlusList, setConfigPlusList] = useState<ConfigPlus>(configPlus);
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
