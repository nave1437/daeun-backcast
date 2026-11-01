import type { NextConfig } from "next";
import os from "node:os";

// 개발 서버를 폰(같은 와이파이)에서 열 때: Next 는 localhost 가 아닌 주소에서 오는 /_next 요청을 막는다.
// 이 맥의 LAN 주소를 전부 허용 목록에 넣는다. 배포(빌드)에는 영향 없음.
const lanHosts = Object.values(os.networkInterfaces())
  .flat()
  .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === "IPv4" && !i.internal)
  .map((i) => i.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: lanHosts,
};

export default nextConfig;
