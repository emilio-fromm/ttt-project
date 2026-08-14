import axios from "axios";

const ENTRIES_API_URL = import.meta.env.VITE_ENTRIES_API_URL || "http://localhost:4000";
const INTEGRATIONS_API_URL = import.meta.env.VITE_INTEGRATIONS_API_URL || "http://localhost:4001";

function makeClient(baseURL) {
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("ttt_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return client;
}

export const entriesApi = makeClient(ENTRIES_API_URL);
export const integrationsApi = makeClient(INTEGRATIONS_API_URL);
