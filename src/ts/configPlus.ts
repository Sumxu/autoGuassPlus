export interface ConfigPlus {
  label: string;
  value: string | number | bigint;
  field: string;
  type: string;
  array: arrayItem[];
  isShow: boolean;
  pickerShow:boolean;
  placeholder: string;
  rows:string|number;
}
interface arrayItem {
  label: string;
  value: string;
}
