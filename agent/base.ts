// import { z } from "zod";
// import {
//   extractContent,
//   navigateTo,
//   performAction,
//   observeContent,
//   performActionSchema,
//   observeContentSchema,
//   navigateToSchema,
// } from "../tools/base.js";
// import { openai } from "@ai-sdk/openai";
// import { Page } from "@browserbasehq/stagehand";
// import { generateText, tool } from "ai";

// export async function agentRun({ page }: { page: Page }) {
//   return await generateText({
//     maxSteps: 50,
//     system: `
//       You are automating a browser session using a set of tools designed for web interaction.
//       The general workflow involves using the 'act', 'navigate', or 'action' tools to perform
//       tasks on a webpage. After executing these actions, it is crucial to 'observe' the page
//       to understand the changes or results of your actions. Based on the observations and
//       the message history, determine the next appropriate task to perform. Continue this
//       process iteratively until the task is completed, ensuring that each step is informed
//       by the previous actions and observations, allowing for a dynamic and responsive
//       browsing session.
//     `,
//     prompt: ``,
//     onStepFinish(event) {
//       console.log(event);
//     },
//     model: openai("gpt-4o-2024-08-06", { structuredOutputs: true }),
//     tools: {
//       act: tool({
//         description: `
//         act() allows you to interact with a web page.
//         Provide an action like "Click on the add to cart button",
//         or "Type 'What is the weather like in L.A.' into the search bar". Small atomic
//         goals perform the best. Avoid using act() to perform complex actions.
//         `,
//         parameters: performActionSchema,
//         execute: async ({ action }) => {
//           const message = await performAction({
//             page,
//             action,
//             variables: {},
//           });
//           return message;
//         },
//       }),
//       observe: tool({
//         description: `
//         observe() is used to get a list of actions that can be taken on the current page.
//         It’s useful for adding context to your planning step, or if you unsure of what page
//         you’re on. returns an array of objects, each with an XPath selector and short description
//         `,
//         parameters: observeContentSchema,
//         execute: async ({ instruction }) => {
//           return await observeContent({ page, instruction });
//         },
//       }),
//       navigate: tool({
//         description: `
//         navigate() allows you to move to a different webpage by specifying a URL.
//         Use this tool to direct the browser to a new site, ensuring the URL is correct
//         and accessible. This is useful for starting a new browsing session or
//         transitioning to another part of a web application.
//         `,
//         parameters: navigateToSchema,
//         execute: async ({ url }) => {
//           await navigateTo({ page, url });
//           return `NAVIGATED TO: "${url}"`;
//         },
//       }),
//       extract: tool({
//         description: `
//         extract() grabs structured text from a web page.
//         Given instructions and a schema, you will receive structured data.
//         The schema is a list of objects, each with a name (key name) and type.
//         For example, to extract product listings, the schema should be:
//         [{name: "product_name", type: "string"}, {name: "product_price", type: "float"}]
//         `,
//         parameters: z.object({
//           instruction: z.string(),
//           schema: z.array(
//             z.object({
//               name: z.string(),
//               type: z.enum(["string", "boolean", "integer", "float"]),
//             })
//           ),
//         }),
//         execute: async ({ instruction, schema }) => {
//           const dynamicObjectSchema = schema.reduce(
//             (
//               acc: Record<string, any>,
//               {
//                 name,
//                 type,
//               }: {
//                 name: string;
//                 type: "string" | "boolean" | "integer" | "float";
//               }
//             ) => {
//               switch (type) {
//                 case "string":
//                   acc[name] = z.string();
//                   break;
//                 case "boolean":
//                   acc[name] = z.boolean();
//                   break;
//                 case "integer":
//                   acc[name] = z.number().int();
//                   break;
//                 case "float":
//                   acc[name] = z.number();
//                   break;
//               }
//               return acc;
//             },
//             {}
//           );

//           const generatedSchema = z.object(dynamicObjectSchema);
//           const extractedContent = await extractContent({
//             page,
//             instruction,
//             schema: generatedSchema,
//           });
//           const prompt = Object.entries(extractedContent)
//             .map(([key, value]) => {
//               if (Array.isArray(value)) {
//                 return `${key}: [${value.join(", ")}]`;
//               } else if (typeof value === "object" && value !== null) {
//                 return `${key}: ${JSON.stringify(value)}`;
//               } else {
//                 return `${key}: ${value}`;
//               }
//             })
//             .join("\n");
//           return prompt;
//         },
//       }),
//     },
//   });
// }
