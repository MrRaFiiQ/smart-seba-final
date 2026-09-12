// playwrightService.js
const { chromium } = require('playwright');
const { createWorker } = require('tesseract.js');

async function scrapeOTP(nid, dob) {
  console.log(`[Playwright] Starting OTP Scraping for NID: ${nid}...`);
  
  const browser = await chromium.launch({ headless: true }); // হেডলেস মোড
  const page = await browser.newPage();
  
  try {
    // ১. লগইন পেজ ওপেন করা
    await page.goto('https://services.nidw.gov.bd/nid-pub/claim-account', { waitUntil: 'networkidle' });
    
    // ২. NID এবং DOB ইনপুট করা
    await page.fill('#nid', nid);
    await page.fill('#dob', dob);
    
    // ৩. ক্যাপচা বাইপাস (অপশনাল: যদি ক্যাপচা থাকে)
    // এখানে আমরা সহজভাবে স্ক্রিনশট নিয়ে Tesseract দিয়ে পড়বো
    // কিন্তু সিম্পল রাখতে আমরা এখানে ডামি ক্যাপচা সলিউশন দিচ্ছি
    // const captchaText = await page.locator('#captcha').inputValue();
    
    // ৪. লগইন বাটনে ক্লিক
    await page.click('#login-btn');
    
    // ৫. OTP পেতে অপেক্ষা করা
    await page.waitForSelector('.otp-input', { timeout: 10000 });
    
    // ৬. OTP নেওয়া
    const otp = await page.locator('.otp-input').inputValue();
    console.log(`[Playwright] Scraped OTP: ${otp}`);
    
    await browser.close();
    return otp;

  } catch (error) {
    console.error('[Playwright] Error:', error.message);
    await browser.close();
    throw new Error('OTP স্ক্র্যাপ করতে ব্যর্থ: ' + error.message);
  }
}

module.exports = { scrapeOTP };
