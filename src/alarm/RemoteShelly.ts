interface RPCResult {
  body: string;
  code: number;
  message: string;
}

type RPCCallback = (result: any, code: number, message: string) => void;

export const RemoteShelly = {
  _cb: function (result: RPCResult, error_code: number, error_message: string, callback: RPCCallback): void {
    let rpcResult = JSON.parse(result.body);
    let rpcCode = result.code;
    let rpcMessage = result.message;
    callback(rpcResult, rpcCode, rpcMessage);
  },
  composeEndpoint: function (method: string): string {
    return "http://" + this.address + "/rpc/" + method;
  },
  call: function (rpc: string, data: any, callback: RPCCallback): void {
    let postData = {
      url: this.composeEndpoint(rpc),
      body: data,
    };
    Shelly.call("HTTP.POST", postData, RemoteShelly._cb, callback);
  },
  getInstance: function (address: string): Omit<typeof RemoteShelly, "getInstance"> {
    let rs = Object.create(this);
    // remove static method
    rs.getInstance = null;
    rs.address = address;
    return rs;
  },
};
