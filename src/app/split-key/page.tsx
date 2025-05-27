
"use client";

import { useState, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, ArrowLeft, Scissors } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';

interface SplitPart {
  partNumber: number;
  content: string;
  variableName: string;
}

const DEFAULT_MAX_PART_SIZE = 3500; // bytes

export default function SplitKeyPage() {
  const [originalKey, setOriginalKey] = useState('');
  const [maxPartSize, setMaxPartSize] = useState<number>(DEFAULT_MAX_PART_SIZE);
  const [splitParts, setSplitParts] = useState<SplitPart[]>([]);
  const [variableNamePrefix, setVariableNamePrefix] = useState('MY_VARIABLE');
  const { toast } = useToast();

  const handleSplitKey = () => {
    if (!originalKey.trim()) {
      toast({
        title: "Input Missing",
        description: "Please paste the key or text you want to split.",
        variant: "destructive",
      });
      return;
    }
    if (maxPartSize <= 0) {
      toast({
        title: "Invalid Size",
        description: "Maximum part size must be greater than 0 bytes.",
        variant: "destructive",
      });
      return;
    }
    if (!variableNamePrefix.trim()) {
        toast({
            title: "Invalid Prefix",
            description: "Variable name prefix cannot be empty.",
            variant: "destructive",
        });
        return;
    }


    const encoder = new TextEncoder();
    const originalKeyByteLength = encoder.encode(originalKey).length;

    if (originalKeyByteLength <= maxPartSize) {
      setSplitParts([{
        partNumber: 1,
        content: originalKey,
        variableName: `${variableNamePrefix}_PART_1`
      }]);
      toast({
        title: "No Splitting Needed",
        description: `The input (${originalKeyByteLength} bytes) is already smaller than or equal to the max part size (${maxPartSize} bytes).`,
      });
      return;
    }

    const parts: SplitPart[] = [];
    let currentPartString = "";
    let currentPartByteLength = 0;
    let partCounter = 1;

    for (let i = 0; i < originalKey.length; i++) {
      const char = originalKey[i];
      const charEncoded = encoder.encode(char);
      const charByteLength = charEncoded.length;

      if (currentPartString.length === 0 && charByteLength > maxPartSize) {
        parts.push({
          partNumber: partCounter,
          content: char,
          variableName: `${variableNamePrefix}_PART_${partCounter}`,
        });
        partCounter++;
        currentPartString = ""; 
        currentPartByteLength = 0;
        continue; 
      }

      if (currentPartByteLength + charByteLength > maxPartSize && currentPartString.length > 0) {
        parts.push({
          partNumber: partCounter,
          content: currentPartString,
          variableName: `${variableNamePrefix}_PART_${partCounter}`,
        });
        partCounter++;
        currentPartString = char;
        currentPartByteLength = charByteLength;
      } else {
        currentPartString += char;
        currentPartByteLength += charByteLength;
      }
    }

    if (currentPartString.length > 0) {
      parts.push({
        partNumber: partCounter,
        content: currentPartString,
        variableName: `${variableNamePrefix}_PART_${partCounter}`,
      });
    }

    setSplitParts(parts);
    toast({
      title: "Splitting Successful",
      description: `Input has been split into ${parts.length} parts.`,
    });
  };

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

  const currentInputBytes = new TextEncoder().encode(originalKey).length;
  const currentInputChars = originalKey.length;

  return (
    <main className="container mx-auto px-4 py-8 md:px-6 md:py-12 max-w-3xl min-h-screen flex flex-col">
      <header className="mb-10">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary lg:text-5xl">
            Split<span className="text-foreground">Text</span> Tool
            </h1>
            <Button variant="outline" asChild>
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to EnvSizeCheck
                </Link>
            </Button>
        </div>
        <p className="text-lg text-muted-foreground">
          Split large environment variables, private keys, or any text into smaller, UTF-8 safe parts.
        </p>
      </header>

      <Card className="w-full shadow-lg rounded-xl mb-10">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Input & Settings</CardTitle>
          <CardDescription>
            Provide the text to split and configure the splitting parameters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="originalKey" className="text-base font-medium">Text to Split</Label>
            <Textarea
              id="originalKey"
              placeholder="Paste your large private key or text here..."
              value={originalKey}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setOriginalKey(e.target.value)}
              rows={10}
              className="mt-2 w-full p-3 border rounded-lg shadow-inner focus:ring-primary focus:border-primary font-mono text-sm bg-background"
              aria-label="Text input to split"
            />
             <p className="text-xs text-muted-foreground mt-1">
                Current size: {currentInputBytes.toLocaleString()} bytes, {currentInputChars.toLocaleString()} characters.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="variableNamePrefix" className="text-base font-medium">Variable Name Prefix</Label>
                <Input
                id="variableNamePrefix"
                type="text"
                value={variableNamePrefix}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setVariableNamePrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                className="mt-2 w-full"
                placeholder="e.g., MY_KEY"
                aria-label="Variable name prefix"
                />
                <p className="text-xs text-muted-foreground mt-1">
                    For generated env var names (e.g., MY_VARIABLE_PART_1). Allows A-Z, 0-9, _.
                </p>
            </div>
            <div>
                <Label htmlFor="maxPartSize" className="text-base font-medium">Max Size Per Part (Bytes)</Label>
                <Input
                id="maxPartSize"
                type="number"
                value={maxPartSize}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxPartSize(parseInt(e.target.value, 10) || 0)}
                min="1"
                className="mt-2 w-full"
                aria-label="Maximum size per part in bytes"
                />
                <p className="text-xs text-muted-foreground mt-1">
                    Maximum byte size for each split part.
                </p>
            </div>
          </div>

        </CardContent>
        <CardFooter>
          <Button onClick={handleSplitKey} className="w-full sm:w-auto" size="lg">
            <Scissors className="mr-2 h-5 w-5" />
            Split Text
          </Button>
        </CardFooter>
      </Card>

      {splitParts.length > 0 && (
        <Card className="w-full shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Split Parts ({splitParts.length})</CardTitle>
            <CardDescription>
              Your text has been split into the following parts. You can copy each part&apos;s content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {splitParts.map((part) => {
                const partByteLength = new TextEncoder().encode(part.content).length;
                const isOversized = partByteLength > maxPartSize;
                return (
                  <Card key={part.partNumber} className={`bg-card ${isOversized ? 'border-destructive' : 'border-border'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-semibold">
                          {part.variableName}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(part.content, `${part.variableName} content`)}
                          aria-label={`Copy content of ${part.variableName}`}
                        >
                          <Copy className="h-4 w-4 mr-1" /> Copy Content
                        </Button>
                      </div>
                      <CardDescription className="text-xs">
                        Size: {partByteLength.toLocaleString()} bytes, {part.content.length.toLocaleString()} characters.
                        {isOversized && (
                            <span className="text-destructive font-medium ml-2">
                                (Exceeds max part size of {maxPartSize} bytes - this part contains a single character that is larger than the set limit)
                            </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="p-3 bg-muted/30 dark:bg-muted/50 rounded-md overflow-x-auto text-xs border border-muted/50">
                        <code className="font-mono whitespace-pre-wrap break-all">
                          {part.content}
                        </code>
                      </pre>
                    </CardContent>
                  </Card>
                );
            })}
            
            {splitParts.length > 1 && (
                <Card className="mt-6 border-dashed border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-lg">Reassembly Example (JavaScript)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                            In your Node.js application code, you would reassemble these parts like this (assuming they are in `process.env`):
                        </p>
                        <pre className="p-3 bg-background dark:bg-card rounded-md overflow-x-auto text-xs border border-muted/50">
                            <code className="font-mono whitespace-pre-wrap break-all">
{`// Reassemble the split variable
const ${variableNamePrefix}_FULL = ${splitParts.map(p => `(process.env.${p.variableName} || '')`).join(' + \n                      ')};

// Now ${variableNamePrefix}_FULL contains the reassembled original text.
// Example: If it was a JSON string, you might parse it:
// try {
//   const config = JSON.parse(${variableNamePrefix}_FULL);
//   console.log('Successfully reassembled and parsed config:', config);
// } catch (error) {
//   console.error('Failed to parse reassembled JSON:', error);
//   // Handle cases where one or more parts might be missing or empty
//   // Ensure all parts (process.env.VAR_PART_X) are defined before concatenating
// }
`}
                            </code>
                        </pre>
                         <p className="text-xs text-muted-foreground mt-3">
                            <strong>Important:</strong> Ensure all parts (e.g., <code>process.env.{variableNamePrefix}_PART_1</code>, <code>process.env.{variableNamePrefix}_PART_2</code>, etc.) are actually set in your environment. The <code>(|| '')</code> helps prevent 'undefined' strings if a part is missing, but robust error handling for missing parts is recommended in production.
                        </p>
                    </CardContent>
                </Card>
            )}
          </CardContent>
        </Card>
      )}
        <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} EnvSizeCheck Tools.</p>
        </footer>
    </main>
  );
}
