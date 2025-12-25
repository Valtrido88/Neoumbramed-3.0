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
    
    // Click on "Acceder a Herramientas"
    console.log('3. Clicking "Acceder a Herramientas"...');
    await page.click('text=Acceder a Herramientas');
    
    // Wait for app layout to be visible
    await page.waitForSelector('#app-layout:not(.hidden)', { timeout: 5000 });
    console.log('4. App layout is now visible');
    
    // Wait for the tools view to be visible
    console.log('5. Waiting for tools view to load...');
    await page.waitForSelector('#tools-view:not(.hidden)', { timeout: 5000 });
    
    // Verify the tools view contains the expected tools
    const toolsTitle = await page.locator('#tools-view h2').textContent();
    console.log(`6. Tools view title: ${toolsTitle}`);
    
    // Count the tool cards
    const toolCards = await page.locator('#tools-view .grid > div').count();
    console.log(`7. Found ${toolCards} tool cards`);
    
    if (toolCards >= 3) {
        // Check if the expected tools are present within the tools-view
        const hasPediatric = await page.locator('#tools-view h3:has-text("Dosificación Pediátrica")').isVisible();
        const hasIMC = await page.locator('#tools-view h3:has-text("Calculadora IMC")').isVisible();
        const hasClearance = await page.locator('#tools-view h3:has-text("Aclaramiento Creatinina")').isVisible();
        
        if (hasPediatric && hasIMC && hasClearance) {
            console.log('8. SUCCESS: All expected tools are present!');
        } else {
            console.error('FAIL: Some tools are missing');
            await browser.close();
            process.exit(1);
        }
    } else {
        console.error('FAIL: Expected at least 3 tool cards');
        await browser.close();
        process.exit(1);
    }
    
    await browser.close();
    console.log('9. Test completed successfully!');
    process.exit(0);
})();
