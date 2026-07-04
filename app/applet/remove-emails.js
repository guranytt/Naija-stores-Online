import fs from "fs";

const content = fs.readFileSync("src/components/VendorAdmin.tsx", "utf-8");
const startIndex = content.indexOf("// Separate component scope for Email Automation to avoid massive state bloat in master function");
const endIndex = content.indexOf("function PlusIcon({ className }: { className?: string }) {");

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = content.substring(0, startIndex) + content.substring(endIndex);
  fs.writeFileSync("src/components/VendorAdmin.tsx", newContent, "utf-8");
  console.log("Replaced successfully!");
} else {
  console.log("Could not find delimiters", { startIndex, endIndex });
}
