import React, { useState, useEffect } from "react";
import type { ConfigPlus } from "@/ts/configPlus";
import { Input, Radio, Picker, TextArea } from "antd-mobile";
interface FormProps {
  configPlusList: ConfigPlus;
  setConfigPlusList: React.Dispatch<React.SetStateAction<ConfigPlus>>;
}
const Form: React.FC<FormProps> = ({ configPlusList, setConfigPlusList }) => {
  //动态绑定配置项
  const [robotType, setRobotType] = useState<string>("0"); // 0抢购 1赎回
  // 更新字段
  const updateField = (field: string, newValue: string | number | bigint) => {
    setConfigPlusList((prevList) =>
      prevList.map((item) =>
        item.field === field
          ? { ...item, value: newValue } // 找到对应 field 更新 value
          : item
      )
    );
  };
  const pickerChange = (v) => {
    setConfigPlusList((prevList) => {
      return prevList.map((item) =>
        item.field === "days" ? { ...item, pickerShow: v } : item
      );
    });
  };
  const pickerConfirm = (v, item) => {
    console.log("v----",v[0])
    console.log("item----",item)
    updateField(item.field, v[0]);
  };
  const setRobotChange = () => {
    let isShowArr = []; //动态展示的字段
    if (getValueByField("robotType") == 0) {
      isShowArr = [
        "robotType",
        "days",
        "maxStakeAmountStr",
        "maxAmount",
        "minAmount",
        "buyType",
        "buyAmount",
        "buySec",
        "initInviter",
        "walletsInputs",
      ];
    } else {
      isShowArr = [
        "robotType",
        "redemType",
        "redemMinSec",
        "redemMaxSec",
        "walletsInputs",
      ];
    }
    setConfigPlusList((prevList) =>
      prevList.map((item) => ({
        ...item,
        isShow: isShowArr.includes(item.field),
      }))
    );
  };
  const getValueByField = (field: string) =>
    configPlusList.find((i) => i.field === field)?.value;

  useEffect(() => {
    setRobotChange();
  }, [getValueByField("robotType")]);
  return (
    <div className="home-page-box">
      <div style={{ padding: 8 }}>
        {configPlusList.map((item, index) => {
          if (!item.isShow) return;
          return (
            <div className="itemOption" key={index}>
              <h3>{item.label}</h3>
              {item.type == "picker" && (
                <div className="boxCenter">
                  <span
                    className="adm-input-element spnOption"
                    onClick={() => pickerChange(true)}
                  >
                    {item.array[0][item.value || 0].label}
                  </span>
                  <Picker
                    columns={item.array}
                    visible={item.pickerShow}
                    onClose={() => {
                      pickerChange(false);
                    }}
                    value={item.value}
                    onConfirm={(v) => {
                      pickerConfirm(v, item);
                    }}
                  />
                </div>
              )}

              {item.type == "formatEther" && (
                <div className="boxCenter">
                  <span className="adm-input-element spnOption">
                    {item.value}
                  </span>
                </div>
              )}

              {item.type == "input" && (
                <div className="boxCenter">
                  <Input
                    value={item.value}
                    onChange={(v) => updateField(item.field, v)}
                    placeholder={item.placeholder}
                  />
                </div>
              )}

              {item.type == "Radio" && (
                <div className="boxCenter">
                  {item.array.map((arrayItem, arrayIndex) => {
                    return (
                      <Radio
                        key={arrayIndex}
                        className="boxRadio"
                        checked={arrayItem.value == item.value}
                        onClick={() => updateField(item.field, arrayItem.value)}
                      >
                        {arrayItem.label}
                      </Radio>
                    );
                  })}
                </div>
              )}

              {item.type == "TextArea" && (
                <div className="boxCenter">
                  <TextArea
                    value={item.value}
                    rows={item.rows}
                    onChange={(v) => updateField(item.field, v)}
                    placeholder={item.placeholder}
                    className="inputWalletsTextArea"
                    style={{
                      "--color": "#FFF",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default Form;
