
"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertCircle, CheckCircle2, Lightbulb, Copy, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";

const KB_LIMIT = 4;
const BYTE_LIMIT = KB_LIMIT * 1024;

const optimizationTips = [
  "Remove unnecessary comments and whitespace from your variable values.",
  "Use shorter variable names if they are part of a large, structured value that gets stringified.",
  "For large JSON objects or multi-line strings (like private keys or certificates), consider storing them in a secure file store (e.g., Google Secret Manager, AWS Secrets Manager, HashiCorp Vault) and referencing their path or ID in the environment variable.",
  "If a single variable is extremely large, evaluate if it can be split into multiple smaller, more manageable variables.",
  "Avoid storing base64 encoded files or large binary data directly in environment variables. Use a file storage service instead.",
  "Review variables for redundancy. Can some information be derived at runtime or fetched from another service?",
  "Compress large string values if the application can decompress them (e.g., gzipping a large JSON string), though this adds complexity.",
  "For structured data, ensure you are using an efficient serialization format (e.g., plain JSON is usually fine, but avoid overly verbose XML if it's a choice).",
  "Regularly audit your environment variables for unused or outdated entries."
];

const workarounds = [
  {
    id: "secret-manager",
    title: "Using a Secret Manager (e.g., Google Secret Manager, AWS Secrets Manager)",
    content: [
      { type: "paragraph", text: "Store large secrets (API keys, database credentials, certificates) in a dedicated secret management service. Your application then fetches these secrets at runtime using a reference stored in the environment variable. This keeps your environment variables small and enhances security." },
      { type: "code", language: "plaintext", code: `// Environment Variable (.env) Example

// Before:
// HUGE_API_KEY="verylongandcomplexapikeyvalue..."
// LARGE_CERT_CONTENT="-----BEGIN CERTIFICATE-----\\nMIIDdDCCAlyg..."

// After (Example for Google Secret Manager):
// API_KEY_SECRET_REF="projects/your-gcp-project/secrets/api-key-name/versions/latest"
// CERT_SECRET_REF="projects/your-gcp-project/secrets/certificate-name/versions/latest"` },
      { type: "paragraph", text: "Note: Your application code will then use the cloud provider's SDK to retrieve the actual secret value using this reference." }
    ]
  },
  {
    id: "splitting-variables",
    title: "Splitting Large Variables",
    content: [
      { type: "paragraph", text: "If a single environment variable contains a very large string, such as a JSON configuration, consider splitting it into multiple smaller variables. Your application will then need to reassemble these parts." },
      { type: "code", language: "plaintext", code: `// Environment Variable (.env) Example

// Before:
// LARGE_JSON_CONFIG='{"featureA": {"enabled": true, "value": "..." }, "featureB": {"enabled": false, "value": "..."}}' // (Imagine this is > 4KB)

// After:
// LARGE_JSON_CONFIG_PART_1='{"featureA": {"enabled": true, "value": "..." },'
// LARGE_JSON_CONFIG_PART_2='"featureB": {"enabled": false, "value": "..."}}'` },
      { type: "paragraph", text: "Note: In your application, you'd concatenate these string parts and then parse the JSON. This method can be cumbersome and is generally less ideal than using a secret manager for structured data." }
    ]
  },
  {
    id: "referencing-files",
    title: "Referencing Files for Large Content",
    content: [
      { type: "paragraph", text: "For content like private keys, service account JSON files, or lengthy configuration files, store them as files within your application's deployment package or a mounted volume (if your platform supports it). Then, use an environment variable to store the *path* to this file." },
      { type: "code", language: "plaintext", code: `// Environment Variable (.env) Example

// Before:
// SERVICE_ACCOUNT_JSON_CONTENT='{ "type": "service_account", "project_id": "...", ... }'

// After:
// SERVICE_ACCOUNT_FILE_PATH="/app/secrets/service-account.json"
// PRIVATE_KEY_FILE_PATH="/etc/ssl/private/my-app.key"` },
      { type: "paragraph", text: "Note: Your application will then read the file content from the specified path. Ensure file permissions and security are correctly handled." }
    ]
  }
];


export default function EnvSizeCheckPage() {
  const [envVars, setEnvVars] = useState('');
  const [byteSize, setByteSize] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const size = new TextEncoder().encode(envVars).length;
    setByteSize(size);
  }, [envVars]);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setEnvVars(event.target.value);
  };

  const percentageUsed = Math.min((byteSize / BYTE_LIMIT) * 100, 100);
  const isOverLimit = byteSize > BYTE_LIMIT;

  const formattedByteSize = byteSize.toLocaleString();
  const formattedKbSize = (byteSize / 1024).toFixed(2);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast({
          title: "Copied to clipboard!",
          description: `${type} has been copied.`,
        });
      })
      .catch(err => {
        toast({
          title: "Copy failed",
          description: "Could not copy to clipboard.",
          variant: "destructive",
        });
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <main className="container mx-auto px-4 py-8 md:px-6 md:py-12 max-w-3xl min-h-screen flex flex-col">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary lg:text-5xl mb-2">
          Env<span className="text-foreground">Size</span>Check
        </h1>
        <p className="text-lg text-muted-foreground">
          Quickly verify if your environment variables are within the common 4KB size limit.
        </p>
      </header>

      <Card className="w-full shadow-lg rounded-xl mb-10">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Environment Variable Input</CardTitle>
          <CardDescription>
            Paste your environment variables below (e.g., content of a <code>.env</code> file or a similar format).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="API_KEY=your_super_long_api_key_here...\nDB_HOST=localhost\n..."
            value={envVars}
            onChange={handleInputChange}
            rows={12}
            className="w-full p-3 border rounded-lg shadow-inner focus:ring-primary focus:border-primary font-mono text-sm bg-background"
            aria-label="Environment variable input area"
          />
        </CardContent>
      </Card>

      <Card className="w-full shadow-lg rounded-xl mb-10">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Size Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center p-4 border rounded-lg bg-card shadow-sm">
            <div>
              <p className="text-sm text-muted-foreground">Current Size</p>
              <p className={`text-3xl font-bold ${isOverLimit ? 'text-destructive' : 'text-primary'}`}>
                {formattedByteSize} bytes
              </p>
              <p className="text-sm text-muted-foreground">
                ({formattedKbSize} KB / {KB_LIMIT} KB Limit)
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(byteSize.toString(), "Byte size")} className="mt-2 sm:mt-0">
              <Copy className="mr-2 h-4 w-4" /> Copy Size
            </Button>
          </div>
          
          <Progress 
            value={percentageUsed} 
            className={`w-full h-4 rounded-lg ${isOverLimit ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'}`} 
            aria-label={`Environment variable size progress: ${percentageUsed.toFixed(0)}%`}
          />

          {isOverLimit ? (
            <div className="flex items-start text-destructive p-4 bg-destructive/10 rounded-lg border border-destructive/20 shadow-sm">
              <AlertCircle className="h-6 w-6 mr-3 shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">Warning: Size Limit Exceeded</h4>
                <p className="text-sm">Your environment variables ({formattedByteSize} bytes) exceed the {KB_LIMIT}KB ({BYTE_LIMIT.toLocaleString()} bytes) limit. This may cause issues during deployment on platforms like Netlify, Vercel, or AWS Lambda.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start text-primary p-4 bg-primary/10 rounded-lg border border-primary/20 shadow-sm">
              <CheckCircle2 className="h-6 w-6 mr-3 shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold">Within Limit</h4>
                <p className="text-sm">Your environment variables are currently within the {KB_LIMIT}KB size limit. Great job!</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full shadow-lg rounded-xl mb-10">
        <CardHeader>
          <div className="flex items-center">
            <Lightbulb className="h-7 w-7 mr-3 text-accent" />
            <CardTitle className="text-2xl font-semibold">Optimization Tips</CardTitle>
          </div>
          <CardDescription>
            Practical suggestions to help you reduce the size of your environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {optimizationTips.map((tip, index) => (
              <li key={index} className="flex items-start text-sm">
                <span className="text-accent mr-2 shrink-0">&bull;</span>
                <span className="text-muted-foreground">{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="w-full shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex items-center">
            <Layers className="h-7 w-7 mr-3 text-primary" />
            <CardTitle className="text-2xl font-semibold">Detailed Workarounds & How-Tos</CardTitle>
          </div>
          <CardDescription>
            Explore detailed methods for handling environment variables that exceed size limits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {workarounds.map((workaround) => (
              <AccordionItem value={workaround.id} key={workaround.id}>
                <AccordionTrigger className="text-base hover:no-underline">
                  {workaround.title}
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm">
                  {workaround.content.map((item, index) => {
                    if (item.type === "paragraph") {
                      return <p key={index} className="text-muted-foreground">{item.text}</p>;
                    }
                    if (item.type === "code") {
                      return (
                        <pre key={index} className="p-3 mt-1 bg-muted/30 dark:bg-muted/50 rounded-md overflow-x-auto text-xs border border-muted/50">
                          <code className="font-mono">{item.code}</code>
                        </pre>
                      );
                    }
                    return null;
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} EnvSizeCheck. All rights reserved.</p>
        <p>Inspired by common platform limitations (e.g., Netlify, Vercel).</p>
      </footer>
    </main>
  );
}
