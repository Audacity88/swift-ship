import { Client } from "langsmith";
import { load } from "https://deno.land/std/dotenv/mod.ts";
import { resolve } from "https://deno.land/std/path/mod.ts";

// Load environment variables from .env.local
const env = await load({ envPath: '.env.local' });

// Verify the API key is loaded
const apiKey = env["LANGSMITH_API_KEY"] || Deno.env.get("LANGSMITH_API_KEY");
if (!apiKey) {
  console.error("LANGSMITH_API_KEY is not set in environment variables");
  Deno.exit(1);
}

// Initialize the LangSmith client with explicit API key
const client = new Client({
  apiKey,
  endpoint: env["LANGSMITH_ENDPOINT"] || "https://api.smith.langchain.com"
});

// Types for our dataset structure
type QuestionAnswerPair = [string, string];
type DatasetPairs = QuestionAnswerPair[];

// Helper function to create a dataset and add examples
async function createAgentDataset(
  datasetName: string,
  questionAnswerPairs: DatasetPairs
): Promise<void> {
  try {
    // Convert pairs to inputs/outputs format
    const inputs = questionAnswerPairs.map(([question]) => ({ message: question }));
    const outputs = questionAnswerPairs.map(([, answer]) => ({ response: answer }));

    // Create the dataset
    const dataset = await client.createDataset(datasetName, {
      description: `Evaluation dataset for ${datasetName}`
    });

    // Add examples to the dataset
    await client.createExamples({
      inputs,
      outputs,
      datasetId: dataset.id,
    });

    console.log(`Created dataset "${datasetName}" with ${questionAnswerPairs.length} examples.`);
  } catch (error) {
    console.error(`Error creating dataset ${datasetName}:`, error);
    throw error;
  }
}

// Define question-answer pairs for each agent
const docsAgentQAPairs: DatasetPairs = [
  [
    "Where can I find Swift Ship's Terms of Service?",
    "You can review the Terms of Service at Terms of Service."
  ],
  [
    "Which shipping methods does Swift Ship currently support?",
    "Swift Ship supports LTL, FTL, and sea container shipping methods."
  ],
  [
    "Where do I open a ticket for general support?",
    "Please open a ticket at Support."
  ],
  [
    "Does Swift Ship handle international deliveries?",
    "Yes, Swift Ship supports international deliveries through our global partner network."
  ],
  [
    "How do I request a refund from Swift Ship?",
    "Refunds can be initiated through Refund Policy or by contacting Support."
  ]
];

const quoteAgentQAPairs: DatasetPairs = [
  [
    "I'd like a shipping quote for 2 pallets from Los Angeles to San Francisco.",
    "Estimated cost is $450, taking approximately 1–2 days."
  ],
  [
    "Does Swift Ship offer discounts for bulk freight?",
    "Yes, bulk freight discounts are available for shipments over 10 tons."
  ],
  [
    "Is express freight available for sea containers?",
    "Express freight is primarily for air or ground; sea containers use standard schedules."
  ],
  [
    "How do I confirm a quoted price is final?",
    "Final quotes are confirmed once you've entered the scheduled pickup details and accepted the terms."
  ],
  [
    "Can you provide a quote for hazardous materials shipping?",
    "Yes, we'll need detailed safety data. Hazardous shipments typically incur a surcharge."
  ]
];

const shipmentsAgentQAPairs: DatasetPairs = [
  [
    "Track shipment ABC-1234-1234567",
    "Shipment ABC-1234-1234567 is in transit and expected to be delivered tomorrow."
  ],
  [
    "Can I change the pickup date for my shipment DEF-5678-7654321?",
    "Pickup for shipment DEF-5678-7654321 has been rescheduled. A new confirmation email is on its way."
  ],
  [
    "Cancel my shipment GHI-9999-8888888",
    "Shipment GHI-9999-8888888 has been successfully cancelled. Any applicable fees will be refunded."
  ],
  [
    "Update the destination address for JKL-0000-1111111",
    "Destination for JKL-0000-1111111 is now updated. Please allow time for routing adjustments."
  ],
  [
    "When was shipment XYZ-0000-2222222 delivered?",
    "Shipment XYZ-0000-2222222 was delivered on November 3, 2025, at 2:45 PM local time."
  ]
];

const supportAgentQAPairs: DatasetPairs = [
  [
    "I'm having trouble resetting my portal password.",
    "Use the Forgot Password link on the login page or contact Support."
  ],
  [
    "Where do I view system alerts or notifications?",
    "All system notifications can be found in your dashboard at /notifications."
  ],
  [
    "How do I schedule a callback with technical support?",
    "Navigate to Support, create a request, and include a callback time preference."
  ],
  [
    "Is there a Knowledge Base for troubleshooting common issues?",
    "Yes, visit Knowledge Base for articles on common problems."
  ],
  [
    "Why am I not receiving email alerts from Swift Ship?",
    "Check your spam folder and ensure your email is verified in Profile settings."
  ]
];

// Main function to create all datasets
async function main() {
  try {
    await createAgentDataset("docs-agent-tests", docsAgentQAPairs);
    await createAgentDataset("quote-agent-tests", quoteAgentQAPairs);
    await createAgentDataset("shipments-agent-tests", shipmentsAgentQAPairs);
    await createAgentDataset("support-agent-tests", supportAgentQAPairs);
    console.log("All datasets created successfully.");
  } catch (error) {
    console.error("Error creating datasets:", error);
    Deno.exit(1);
  }
}

// Execute the main function
main();
