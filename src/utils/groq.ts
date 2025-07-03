import Groq from "groq-sdk";
import { config } from "dotenv";

config();

const groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default { groqInstance };
