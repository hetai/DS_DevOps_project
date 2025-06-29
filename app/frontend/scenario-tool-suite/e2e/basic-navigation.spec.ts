import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
  test('should load homepage and navigate to all main pages', async ({ page }) => {
    // Start from the index page.
    await page.goto('/');

    // Check that the main navigation is visible
    await expect(page.locator('text=OpenSCENARIO Tool Suite')).toBeVisible();
    
    // Check that all navigation links are present
    await expect(page.locator('text=Scenario Player')).toBeVisible();
    await expect(page.locator('text=Scenario Generator')).toBeVisible();
    await expect(page.locator('text=Scenario Validator')).toBeVisible();

    // Test navigation to Scenario Generator
    await page.click('text=Scenario Generator');
    await expect(page.locator('h1:has-text("Scenario Generator")')).toBeVisible();
    
    // Test navigation to Scenario Validator  
    await page.click('text=Scenario Validator');
    await expect(page.locator('h1:has-text("Scenario Validator")')).toBeVisible();
    
    // Test navigation back to Scenario Player
    await page.click('text=Scenario Player');
    await expect(page.locator('h1:has-text("Scenario Player")')).toBeVisible();
  });

  test('should display proper page titles', async ({ page }) => {
    // Test Scenario Player page
    await page.goto('/');
    await expect(page).toHaveTitle(/OpenSCENARIO Tool Suite/);
    
    // Test Scenario Generator page
    await page.goto('/generator');
    await expect(page).toHaveTitle(/OpenSCENARIO Tool Suite/);
    
    // Test Scenario Validator page
    await page.goto('/validator');
    await expect(page).toHaveTitle(/OpenSCENARIO Tool Suite/);
  });
});

test.describe('Scenario Player Functionality', () => {
  test('should have file upload functionality', async ({ page }) => {
    await page.goto('/');
    
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
    await page.goto('/generator');
    
    // Check that chat interface exists
    await expect(page.locator('text=AI Assistant')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="describe"]')).toBeVisible();
    
    // Check that initial message is displayed
    await expect(page.locator('text=Hello! I\'m here to help you create OpenSCENARIO files')).toBeVisible();
  });
});

test.describe('Scenario Validator Functionality', () => {
  test('should have file upload and validation interface', async ({ page }) => {
    await page.goto('/validator');
    
    // Check that file upload exists
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page.locator('text=Choose Files')).toBeVisible();
    
    // Check that validate button exists
    await expect(page.locator('button:has-text("Validate")')).toBeVisible();
    
    // Check that validation results area exists
    await expect(page.locator('text=Validation Results')).toBeVisible();
  });
});