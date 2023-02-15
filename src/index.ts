/// <reference lib="es2018.regexp" />
import { spawn, ChildProcess } from "child_process";

export interface LocalhostRunClientOptions {
  port: number;
  timeout?: number;
  domain?: string;
}

export interface Tunnel {
  domain: string;
  secure: string;
  insecure: string;
  close: () => boolean;
  on: ChildProcess["on"];
  off: ChildProcess["off"];
  once: ChildProcess["once"];
}

export function createExternalUrl({
  port,
  timeout = 10_000,
  domain,
}: LocalhostRunClientOptions): Promise<Tunnel> {
  return new Promise((resolve, reject) => {
    let hasTimedOut = false;
    const sshParams = [
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      "-R",
      `${domain ? `${domain}:` : ""}80:localhost:${port}`,
      domain ? "plan@localhost.run" : "localhost.run",
    ];
    const ssh = spawn("ssh", sshParams, {
      detached: false,
    });
    const currTimeout = setTimeout(() => {
      hasTimedOut = true;
      reject(new Error("SSH connection timed out"));
    }, timeout);
    ssh.stdout.on("data", (data) => {
      const connectionText = data.toString() as string;
      const { groups: { assignedDomain = "" } = {} } = /https\:\/\/(?<assignedDomain>.*)/.exec(connectionText) ?? {}
      if (!hasTimedOut && assignedDomain) {
        clearTimeout(currTimeout);
        const close = () => ssh.kill();
        const on = ssh.on.bind(ssh);
        const off = ssh.off.bind(ssh);
        const once = ssh.once.bind(ssh);
        resolve({
          domain: assignedDomain,
          secure: `https://${assignedDomain}`,
          insecure: `http://${assignedDomain}`,
          close,
          on,
          off,
          once,
        });
      }
    });
    // ssh.stderr.on("data", (data) => {
    //   const matches = (data as string).match(/(\S+\.lhrtunnel\.link)\s/g);
    //   if (!hasTimedOut && matches?.length == 2) {
    //     clearTimeout(currTimeout);
    //     const url = matches[1];
    //     resolve(url);
    //   }
    // });
  });
}

export default createExternalUrl;

// const test = async () => {
//   const result = await createExternalUrl({
//     port: 9000,
//     domain: "fabrizio.tunnel.hypersay.com",
//     timeout: 5000,
//   });

//   console.log(result);

//   setTimeout(() => {
//     result.close();
//   }, 3000);
// };

// test();
