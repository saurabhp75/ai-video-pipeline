// fal.ts

import { fal } from "@fal-ai/client";
import dotenv from "dotenv";

dotenv.config();

fal.config({
	credentials: process.env.FAL_KEY,
});

export { fal };
