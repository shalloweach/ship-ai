// src/api/workflow.js
import axios from "axios";

const BASE_URL = "http://106.15.176.173/v1";  // 你的 Dify 服务地址
const API_KEY = "你的_api_key"; // ⚠️ 不要放前端生产环境，建议走后端代理

export async function runWorkflow(mmsi) {
  try {
    const response = await axios.post(
      `${BASE_URL}/workflows/run`,
      {
        inputs: { mmsi }, // 传给工作流的输入
        response_mode: "blocking",
        user: "frontend-user"
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (err) {
    console.error("执行 workflow 出错:", err);
    throw err;
  }
}
