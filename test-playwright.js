const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'error') console.error('BROWSER console.error:', msg.text());
    });
    
    console.log('1. Navigating to http://127.0.0.1:8080...');
    await page.goto('http://127.0.0.1:8080');
    
    // Verify landing page is visible
    const landingPage = await page.locator('#landing-page');
    const isLandingVisible = await landingPage.isVisible();
    console.log(`2. Landing page visible: ${isLandingVisible}`);
    
    if (!isLandingVisible) {
        console.error('FAIL: Landing page not visible');
        await browser.close();
        process.exit(1);
    }
    
    // Click on "Empezar Ahora"
    console.log('3. Clicking "Empezar Ahora"...');
    await page.click('text=Empezar Ahora');
    
    // Wait for app layout to be visible
    await page.waitForSelector('#app-layout:not(.hidden)', { timeout: 5000 });
    console.log('4. App layout is now visible');
    
    // Wait for the table to load (data fetching)
    console.log('5. Waiting for questions to load...');
    await page.waitForSelector('#questions-table-body tr', { timeout: 15000 });
    await page.waitForTimeout(500);
    
    // Count rows in the table
    const rows = await page.locator('#questions-table-body tr').count();
    console.log(`6. Table has ${rows} rows`);
    
    if (rows > 0) {
        // Check if we have actual data (not error message)
        const firstRowText = await page.locator('#questions-table-body tr:first-child').textContent();
        if (firstRowText.includes('Error')) {
            console.error('FAIL: Error loading data');
            console.log('Row content:', firstRowText);
            await browser.close();
            process.exit(1);
        }
        console.log('7. SUCCESS: Questions loaded correctly!');
        console.log('First row preview:', firstRowText.substring(0, 100) + '...');
    } else {
        console.error('FAIL: No rows found');
        await browser.close();
        process.exit(1);
    }
    
    await browser.close();
    console.log('8. Test completed successfully!');
    process.exit(0);
})();
