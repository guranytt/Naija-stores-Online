const bankNum = 123456789;
try {
  const maskedBankNum = bankNum 
    ? `*`.repeat(Math.max(0, bankNum.length - 4)) + bankNum.substring(Math.max(0, bankNum.length - 4))
    : 'Not Configured';
  console.log(maskedBankNum);
} catch (e) {
  console.error(e.toString());
}
