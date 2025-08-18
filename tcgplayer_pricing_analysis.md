# TCGPlayer Pricing API Analysis

## Current Implementation

### What We're Currently Using
Based on the codebase analysis, here's what our MTG Pricer app currently does:

1. **API Endpoint**: `/pricing?product_id={productId}`
2. **Data Extraction**: We extract `marketPrice` from the matching `subTypeName`
3. **Condition Mapping**: 
   - `selectedFinish === 'foil'` → `'Foil'`
   - `selectedFinish !== 'foil'` → `'Normal'`

### Current Pricing Logic
```javascript
// From MTGPricer.js line 218-220
const targetCondition = getTCGPlayerCondition(finish);
const condition = data.pricing?.results?.find(r => r.subTypeName === targetCondition);
const lpPrice = condition?.marketPrice || null;
```

**Key Issue**: We're using `marketPrice` but calling it "LP" (Lightly Played) in our UI!

## TCGPlayer Pricing Data Structure

Based on the API implementation in `tcgplayer_client.py`, each product returns:

```json
{
  "pricing": {
    "results": [
      {
        "subTypeName": "Normal" | "Foil",
        "lowPrice": 1.23,
        "midPrice": 2.45,
        "highPrice": 3.67,
        "marketPrice": 2.10,
        "directLowPrice": 1.85
      }
    ]
  }
}
```

## Available Pricing Options

### Price Types We Have Access To:
1. **`marketPrice`** ✅ *Currently Used*
   - TCGPlayer's calculated market value
   - Most representative of current market conditions
   - **This is NOT LP condition pricing**

2. **`lowPrice`** 
   - Lowest current listing price
   - May include damaged/poor condition cards
   - Most aggressive pricing

3. **`midPrice`**
   - Mid-range pricing
   - Average of current listings
   - Balanced approach

4. **`highPrice`**
   - Highest current listing price
   - Premium/NM condition pricing
   - Most conservative pricing

5. **`directLowPrice`**
   - Lowest price from TCGPlayer Direct
   - Verified condition quality
   - Could be good alternative to marketPrice

### Condition Types (`subTypeName`):
- **`"Normal"`** = Non-foil versions
- **`"Foil"`** = Foil versions

## Problem with Current Implementation

### ❌ **Misleading Labeling**
Our app says "LP (Lightly Played)" but we're actually using `marketPrice` which is:
- A calculated market value across ALL conditions
- NOT specific to LP condition
- Could be based on NM, LP, MP, or any condition mix

### ❌ **No True Condition-Specific Pricing**
TCGPlayer API doesn't provide condition-specific pricing (NM, LP, MP, HP) in their standard endpoint.

## Recommendations

### Option 1: Fix the Labeling (Immediate)
```javascript
// Change from misleading "LP" to accurate "Market"
<Typography>Base Price: ${pricing.marketPrice.toFixed(2)} (Market)</Typography>
```

### Option 2: Use Alternative Pricing (Better)
```javascript
// Use directLowPrice for more consistent quality
const basePrice = condition?.directLowPrice || condition?.marketPrice || null;
```

### Option 3: Enhanced Pricing Display (Best)
Show multiple price points for transparency:
```javascript
// Show range of available prices
const priceData = {
  market: condition?.marketPrice,
  low: condition?.lowPrice,
  high: condition?.highPrice,
  direct: condition?.directLowPrice
};
```

## Current Multiplier Logic Issue

Our condition multipliers are applied to `marketPrice`:
```javascript
// From Settings - these multipliers are NOT based on actual condition pricing
'NM': 1.0,    // 100% of market price (misleading)
'EX': 0.9,    // 90% of market price (not real EX pricing)
'VG': 0.75,   // 75% of market price (not real VG pricing)
'G': 0.5      // 50% of market price (not real G pricing)
```

**The Issue**: These are arbitrary multipliers applied to market pricing, not actual condition-based pricing from TCGPlayer.

## Recommendations for Pricing Accuracy

### 1. Use `directLowPrice` as Base
- More consistent quality standard
- TCGPlayer Direct has verified conditions
- Better foundation for multipliers

### 2. Update UI Language
- Remove "LP" references
- Use "Market" or "Base" pricing terminology
- Clarify that condition multipliers are estimates

### 3. Consider Alternative Approaches
- Use `highPrice` for NM estimates
- Use `lowPrice` for lower condition estimates
- Implement hybrid pricing logic

## Example Improved Implementation

```javascript
const getPricingBase = (pricingData, finish) => {
  const condition = pricingData.results?.find(r => r.subTypeName === finish);
  if (!condition) return null;
  
  // Priority: directLowPrice > marketPrice > midPrice
  return condition.directLowPrice || condition.marketPrice || condition.midPrice || null;
};

const getPricingRange = (pricingData, finish) => {
  const condition = pricingData.results?.find(r => r.subTypeName === finish);
  if (!condition) return null;
  
  return {
    low: condition.lowPrice,
    market: condition.marketPrice,
    high: condition.highPrice,
    direct: condition.directLowPrice
  };
};
```

## Summary

**Current Status**: We're using `marketPrice` but mislabeling it as "LP pricing"

**Available Options**: 5 different price points per foil/non-foil variant

**Recommendation**: Switch to `directLowPrice` as base and update UI to reflect actual pricing methodology
