import { spawn } from "child_process";

interface LocalhostRunClientOptions {
  port: number;
  timeout?: number;
  domain?: string;
}

export function createExternalUrl({
  port,
  timeout = 10_000,
  domain,
}: LocalhostRunClientOptions) {
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
      let assignedDomain: string | null = null;
      const connectionText = data.toString() as string;
      if (domain && connectionText.includes(domain)) {
        assignedDomain = domain;
      } else {
        const matches = connectionText.match(/(\S+\.lhrtunnel\.link)\s/g);
        if (matches && matches.length >= 2) {
          assignedDomain = matches[0].trim();
        }
      }
      if (!hasTimedOut && assignedDomain) {
        clearTimeout(currTimeout);
        resolve({
          domain: assignedDomain,
          secure: `https://${assignedDomain}`,
          insecure: `http://${assignedDomain}`,
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
// };

// test();
