import { spawn } from "child_process";

interface LocalhostRunClientOptions {
  port: number;
  timeout?: number;
}

export function createExternalUrl({
  port,
  timeout = 5000,
}: LocalhostRunClientOptions) {
  return new Promise((resolve, reject) => {
    let hasTimedOut = false;
    const ssh = spawn(
      "ssh",
      [
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "UserKnownHostsFile=/dev/null",
        "-R",
        `80:localhost:${port}`,
        "localhost.run",
      ],
      {
        detached: false,
      }
    );
    const currTimeout = setTimeout(() => {
      hasTimedOut = true;
      reject(new Error("SSH connection timed out"));
    }, timeout);
    ssh.stdout.on("data", (data) => {
      // console.log(data);
      const matches = data.toString().match(/(\S+\.lhrtunnel\.link)\s/g);
      if (!hasTimedOut && matches?.length >= 2) {
        clearTimeout(currTimeout);
        const domain = matches[0].trim();
        resolve({
          domain: domain,
          secure: `https://${domain}`,
          insecure: `http://${domain}`,
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
//     port: 3000,
//   });

//   console.log(result);
// };

// test();
