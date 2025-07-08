import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
  test('should load homepage and navigate to all main pages', async ({ page }) => {
    // Start from the index page (now AI Generator).
    await page.goto('/');

    // Check that the main navigation is visible
    await expect(page.locator('text=OpenSCENARIO Suite')).toBeVisible();
    
    // Check that all navigation links are present
    await expect(page.locator('text=AI Generator')).toBeVisible();
    await expect(page.locator('text=Scenario Player')).toBeVisible();

    // Should start on AI Generator page
    await expect(page.locator('h1:has-text("AI Scenario Generator")')).toBeVisible();
    
    // Test navigation to Scenario Player
    await page.click('text=Scenario Player');
    await expect(page.locator('h1:has-text("Scenario Player")')).toBeVisible();
    
    // Test navigation back to AI Generator
    await page.click('text=AI Generator');
    await expect(page.locator('h1:has-text("AI Scenario Generator")')).toBeVisible();
  });

  test('should display proper page titles', async ({ page }) => {
    // Test AI Generator page (homepage)
    await page.goto('/');
    await expect(page).toHaveTitle(/OpenSCENARIO Tool Suite/);
    
    // Test Scenario Player page
    await page.goto('/player');
    await expect(page).toHaveTitle(/OpenSCENARIO Tool Suite/);
  });
});

test.describe('Scenario Player Functionality', () => {
  test('should have file upload functionality', async ({ page }) => {
    await page.goto('/player');
    
    // Check that file input exists
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page.locator('text=Choose OpenSCENARIO File')).toBeVisible();
    
    // Check that simulation button is disabled initially
    await expect(page.locator('button:has-text("Run Simulation")')).toBeDisabled();
    
    // Check that results area exists
    await expect(page.locator('textarea[readonly]')).toBeVisible();
    await expect(page.locator('text=3D Visualization')).toBeVisible();
  });
});

test.describe('Scenario Generator Functionality', () => {
  test('should have chat interface', async ({ page }) => {
    await page.goto('/');
    
    // Check that chat interface exists
    await expect(page.locator('text=AI Assistant')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="describe"]')).toBeVisible();
    
    // Check that initial message is displayed
    await expect(page.locator('text=Hello! I\'m here to help you create OpenSCENARIO files')).toBeVisible();
  });
});