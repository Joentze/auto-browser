import { z } from "zod";
import { Page } from "@browserbasehq/stagehand";

/**
 * Interface representing the properties required for using a browser tool.
 */
export interface browserUseToolProps {
  page: Page; // The Playwright Page instance.
}

/**
 * Interface for properties required to navigate to a URL.
 */
export interface navigateToToolProps extends browserUseToolProps {
  url: string; // The URL to navigate to.
}

/**
 * Zod schema for validating navigation properties.
 */
export const navigateToSchema = z.object({
  url: z.string(), // URL must be a string.
});

/**
 * Interface for properties required to perform an action.
 */
export interface performActionToolProps extends browserUseToolProps {
  action: string; // The action to perform.
  variables: Record<string, string>; // Variables associated with the action.
}

/**
 * Zod schema for validating action properties.
 */
export const performActionSchema = z.object({
  action: z.string(), // Action must be a string.
  // Variables must be a record of strings.
});

/**
 * Interface for properties required to observe content.
 */
export interface observeContentToolProps extends browserUseToolProps {
  instruction: string; // Instruction for observing content.
}

/**
 * Zod schema for validating observation properties.
 */
export const observeContentSchema = z.object({
  instruction: z.string(), // Instruction must be a string.
});

/**
 * Interface for properties required to extract content.
 * @template T - The Zod object schema type.
 */
export interface extractContentToolProps<T extends z.AnyZodObject>
  extends browserUseToolProps {
  instruction: string; // Instruction for extracting content.
  schema: T; // Zod schema for the content to extract.
}

/**
 * Zod schema for validating extraction properties.
 */
export const extractContentSchema = z.object({
  instruction: z.string(), // Instruction must be a string.
  schema: z.lazy(() => z.any()), // Schema can be any Zod object.
});

export const extractContentSchemaArgs = z.object({
  instruction: z.string(),
  schema: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["string", "float", "integer", "boolean"]),
    })
  ),
});
/**
 * Extracts content from a page based on the given instruction and schema.
 * @template T - The Zod object schema type.
 * @param {extractContentToolProps<T>} props - The properties for content extraction.
 * @returns {Promise<z.infer<T>>} - A promise that resolves to the extracted content.
 */
export async function extractContent<T extends z.AnyZodObject>({
  page,
  instruction,
  schema,
}: extractContentToolProps<T>): Promise<z.infer<T>> {
  return await page.extract({
    instruction,
    schema,
  });
}

/**
 * Navigates to a specified URL using the given page.
 * @param {navigateToToolProps} props - The properties for navigation.
 */
export async function navigateTo({ page, url }: navigateToToolProps) {
  await page.goto(url);
}

/**
 * Performs an action on a page with the specified variables.
 * @param {performActionToolProps} props - The properties for performing an action.
 */
export async function performAction({
  page,
  action,
  variables,
}: performActionToolProps) {
  const { message } = await page.act({ action, variables, useVision: true });
  return message;
}

/**
 * Observes content on a page based on the given instruction.
 * @param {observeContentToolProps} props - The properties for content observation.
 * @returns {Promise<string>} - A promise that resolves to a string describing the observed content.
 */
export async function observeContent({
  page,
  instruction,
}: observeContentToolProps): Promise<string> {
  const results = await page.observe({ instruction });
  return results
    .map(
      ({ selector, description }) =>
        `Selector: ${selector}, Description: ${description}`
    )
    .join("\n");
}
