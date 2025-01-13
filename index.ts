/**
 * 🤘 Welcome to Stagehand!
 *
 * TO RUN THIS PROJECT:
 * ```
 * npm install
 * npm run start
 * ```
 *
 * To edit config, see `stagehand.config.ts`
 *
 * In this quickstart, we'll be automating a browser session to show you the power of Playwright and Stagehand's AI features.
 *
 * 1. Go to https://docs.browserbase.com/
 * 2. Use `extract` to find information about the quickstart
 * 3. Use `observe` to find the links under the 'Guides' section
 * 4. Use Playwright to click the first link. If it fails, use `act` to gracefully fallback to Stagehand AI.
 */

import StagehandConfig from "./stagehand.config.js";
import { Page, BrowserContext, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import chalk from "chalk";
import boxen from "boxen";
import dotenv, { parse } from "dotenv";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  navigateTo,
  performAction,
  observeContent,
  extractContent,
} from "./tools/base.js";

dotenv.config();

const VARIABLES = {
  email: ``,
  password: ``,
};

const stepArgsSchema = z.object({
  prompt: z.string(),
  navigateToUrl: z.string(),
  schema: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["string", "float", "integer", "boolean"]),
    })
  ),
});

const planStepSchema = z.object({
  action: z.enum(["navigate", "act", "observe", "extract"]),
  navigateToUrl: z.union([z.string(), z.null()]).optional(),
  args: stepArgsSchema,
});
const planStepsSchema = z.object({ steps: z.array(planStepSchema) });

type PlanStepModel = z.infer<typeof planStepSchema>;

async function getPlanSteps({
  prompt,
}: {
  prompt: string;
}): Promise<PlanStepModel[]> {
  const client = new OpenAI();
  const { choices } = await client.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      {
        role: "system",
        content: `
        You are automating a browser session using a set of tools designed for web interaction.
        The general workflow involves using the 'act', 'navigate', or 'action' tools to perform
        tasks on a webpage. After executing these actions, it is crucial to 'observe' the page
        to understand the changes or results of your actions. Based on the observations and
        the message history, determine the next appropriate task to perform. Continue this
        process iteratively until the task is completed, ensuring that each step is informed
        by the previous actions and observations, allowing for a dynamic and responsive
        browsing session.

        Your job is to plan the steps to take. 
        
        For 'navigate', you MUST include \`navigateToUrl\`, in the \`args\`
        For 'extract', you MUST include \`schema\` in the \`args\`

        Fill in the PROMPT. The PROMPT must be a clear instruction for each step

        `,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: zodResponseFormat(planStepsSchema, "steps"),
  });

  if (
    !choices ||
    choices.length === 0 ||
    !choices[0].message ||
    !choices[0].message.parsed
  ) {
    throw new Error("there are no steps planned!");
  }
  const parsed = choices[0].message.parsed;
  if (!Array.isArray(parsed.steps)) {
    throw new Error("Parsed steps are not in the expected format!");
  }
  for (const step of parsed.steps) {
    console.log(step.args);
  }
  return parsed.steps as PlanStepModel[];
}

async function main({
  page,
  prompt,
  context,
  stagehand,
}: {
  prompt: string;
  page: Page; // Playwright Page with act, extract, and observe methods
  context: BrowserContext; // Playwright BrowserContext
  stagehand: Stagehand; // Stagehand instance
}) {
  if (StagehandConfig.env === "BROWSERBASE" && stagehand.browserbaseSessionID) {
    console.log(
      boxen(
        `View this session live in your browser: \n${chalk.blue(
          `https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`
        )}`,
        {
          title: "Browserbase",
          padding: 1,
          margin: 3,
        }
      )
    );
  }
  const steps = await getPlanSteps({ prompt });

  for (let step of steps) {
    const { args } = step as PlanStepModel;
    switch (step.action) {
      case "navigate":
        if (!args.navigateToUrl) {
          throw new Error("there was no url present");
        }
        await navigateTo({ page, url: args.navigateToUrl });
        break;

      case "act":
        const message = await performAction({
          page,
          action: args.prompt,
          variables: VARIABLES,
        });
        console.log(message);
        break;

      case "observe":
        const observation = await observeContent({
          page,
          instruction: args.prompt,
        });
        console.log(observation);
        break;

      case "extract":
        if (!args.schema) {
          throw new Error("there was no schema present");
        }
        const schema = args.schema.reduce(
          (
            acc: Record<string, any>,
            {
              name,
              type,
            }: {
              name: string;
              type: "string" | "boolean" | "integer" | "float";
            }
          ) => {
            switch (type) {
              case "string":
                acc[name] = z.string();
                break;
              case "boolean":
                acc[name] = z.boolean();
                break;
              case "integer":
                acc[name] = z.number().int();
                break;
              case "float":
                acc[name] = z.number();
                break;
            }
            return acc;
          },
          {}
        );
        const generatedSchema = z.object(schema);
        const extractedContent = await extractContent({
          page,
          instruction: args.prompt,
          schema: generatedSchema,
        });
        console.log("Extracted Content:", extractedContent);
        break;

      default:
        console.error("Unknown action type:", step.action);
    }
  }

  await stagehand.close();

  process.exit(0);
}

(async () => {
  const stagehand = new Stagehand({
    ...StagehandConfig,
  });
  await stagehand.init();
  const page = stagehand.page;
  const context = stagehand.context;

  await main({
    prompt: `
   
    `,
    page,
    context,
    stagehand,
  });
  await stagehand.close();
})().catch(console.error);
