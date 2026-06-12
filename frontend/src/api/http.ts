import axios from "axios";
import { resolveApiBase } from "../config/apiOrigin";

const http = axios.create({
  baseURL: resolveApiBase(),
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

export default http;
