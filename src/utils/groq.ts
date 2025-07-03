import Groq from "groq-sdk";
import { config } from "dotenv";
config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default { groq };
