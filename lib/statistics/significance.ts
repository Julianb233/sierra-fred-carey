/**
 * Pure TypeScript statistical significance tests for A/B testing.
 *
 * Implements chi-squared test (binary metrics) and Welch's t-test (continuous metrics)
 * with CDF approximations via Lanczos gamma and continued-fraction beta.
 *
 * No external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChiSquaredResult {
  chiSquared: number
  degreesOfFreedom: number
  pValue: number
  significant: boolean
  alpha: number
}

export interface TTestResult {
  tStatistic: number
  degreesOfFreedom: number
  pValue: number
  significant: boolean
  alpha: number
  meanDifference: number
  confidenceInterval: [number, number]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MIN_SAMPLE_SIZE = 500
const DEFAULT_ALPHA = 0.05

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Chi-squared test for 2x2 contingency table with Yates' continuity correction.
 * Input: two pairs of [success, failure] counts.
 */
export function chiSquaredTest(
  observed1: [number, number],
  observed2: [number, number],
  alpha: number = DEFAULT_ALPHA
): ChiSquaredResult {
  const [a, b] = observed1
  const [c, d] = observed2
  const n = a + b + c + d

  if (n === 0) {
    return { chiSquared: 0, degreesOfFreedom: 1, pValue: 1, significant: false, alpha }
  }

  // Expected values for 2x2 contingency table
  const rowSums = [a + b, c + d]
  const colSums = [a + c, b + d]

  const expected: number[][] = [
    [(rowSums[0] * colSums[0]) / n, (rowSums[0] * colSums[1]) / n],
    [(rowSums[1] * colSums[0]) / n, (rowSums[1] * colSums[1]) / n],
  ]

  const observed = [[a, b], [c, d]]

  // Chi-squared with Yates' continuity correction
  let chiSq = 0
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      const e = expected[i][j]
      if (e > 0) {
        const diff = Math.max(Math.abs(observed[i][j] - e) - 0.5, 0)
        chiSq += (diff * diff) / e
      }
    }
  }

  const df = 1
  const pValue = 1 - chiSquaredCDF(chiSq, df)

  return {
    chiSquared: chiSq,
    degreesOfFreedom: df,
    pValue,
    significant: pValue < alpha,
    alpha,
  }
}

/**
 * Welch's t-test for two independent samples (unequal variance).
 * Two-tailed test.
 */
export function welchTTest(
  sample1: { mean: number; variance: number; n: number },
  sample2: { mean: number; variance: number; n: number },
  alpha: number = DEFAULT_ALPHA
): TTestResult {
  const { mean: m1, variance: v1, n: n1 } = sample1
  const { mean: m2, variance: v2, n: n2 } = sample2

  if (n1 <= 1 || n2 <= 1) {
    return {
      tStatistic: 0,
      degreesOfFreedom: 0,
      pValue: 1,
      significant: false,
      alpha,
      meanDifference: m1 - m2,
      confidenceInterval: [m1 - m2, m1 - m2],
    }
  }

  const se1 = v1 / n1
  const se2 = v2 / n2
  const se = Math.sqrt(se1 + se2)

  if (se === 0) {
    return {
      tStatistic: 0,
      degreesOfFreedom: n1 + n2 - 2,
      pValue: 1,
      significant: false,
      alpha,
      meanDifference: m1 - m2,
      confidenceInterval: [m1 - m2, m1 - m2],
    }
  }

  const t = (m1 - m2) / se

  // Welch-Satterthwaite degrees of freedom
  const numerator = (se1 + se2) ** 2
  const denominator = (se1 ** 2) / (n1 - 1) + (se2 ** 2) / (n2 - 1)
  const df = denominator > 0 ? numerator / denominator : 1

  // Two-tailed p-value
  const pValue = 2 * (1 - tDistributionCDF(Math.abs(t), df))

  // Confidence interval for mean difference
  const tCrit = tCriticalValue(alpha / 2, df)
  const marginOfError = tCrit * se
  const meanDiff = m1 - m2

  return {
    tStatistic: t,
    degreesOfFreedom: df,
    pValue,
    significant: pValue < alpha,
    alpha,
    meanDifference: meanDiff,
    confidenceInterval: [meanDiff - marginOfError, meanDiff + marginOfError],
  }
}

/** Simple significance check. */
export function isSignificant(pValue: number, alpha: number = DEFAULT_ALPHA): boolean {
  return pValue < alpha
}

/** Check if both sample sizes meet the minimum requirement. */
export function meetsMinimumSampleSize(n1: number, n2: number, minimum: number = MIN_SAMPLE_SIZE): boolean {
  return n1 >= minimum && n2 >= minimum
}

// ---------------------------------------------------------------------------
// Internal CDF approximations
// ---------------------------------------------------------------------------

/** Log-gamma via Lanczos approximation (g=7, n=9). */
function gammaLn(x: number): number {
  const coefs = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ]
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - gammaLn(1 - x)
  }
  x -= 1
  let a = coefs[0]
  const t = x + 7.5
  for (let i = 1; i < coefs.length; i++) {
    a += coefs[i] / (x + i)
  }
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

/**
 * Regularized lower incomplete gamma function P(a, x).
 * Series expansion for x < a+1, continued fraction otherwise.
 */
function regularizedIncompleteGamma(a: number, x: number): number {
  if (x < 0) return 0
  if (x === 0) return 0
  if (a <= 0) return 1

  if (x < a + 1) {
    let sum = 1 / a
    let term = 1 / a
    for (let n = 1; n < 200; n++) {
      term *= x / (a + n)
      sum += term
      if (Math.abs(term) < Math.abs(sum) * 1e-15) break
    }
    return sum * Math.exp(-x + a * Math.log(x) - gammaLn(a))
  } else {
    let c = 1e-30
    let d = 1 / (x + 1 - a)
    let h = d
    for (let n = 1; n < 200; n++) {
      const an = n * (a - n)
      const bn = x + 2 * n + 1 - a
      d = bn + an * d
      if (Math.abs(d) < 1e-30) d = 1e-30
      d = 1 / d
      c = bn + an / c
      if (Math.abs(c) < 1e-30) c = 1e-30
      const delta = c * d
      h *= delta
      if (Math.abs(delta - 1) < 1e-15) break
    }
    return 1 - h * Math.exp(-x + a * Math.log(x) - gammaLn(a))
  }
}

/** Chi-squared CDF: P(X <= x) for df=k. */
function chiSquaredCDF(x: number, k: number): number {
  if (x <= 0) return 0
  return regularizedIncompleteGamma(k / 2, x / 2)
}

/**
 * Regularized incomplete beta function I_x(a, b)
 * via continued fraction (Lentz's method).
 */
function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1

  // Symmetry transform for better convergence
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedIncompleteBeta(b, a, 1 - x)
  }

  const lnBeta = gammaLn(a) + gammaLn(b) - gammaLn(a + b)
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a

  // Continued fraction
  let f = 1
  let c = 1
  let d = 1 - ((a + b) * x) / (a + 1)
  if (Math.abs(d) < 1e-30) d = 1e-30
  d = 1 / d
  f = d

  for (let m = 1; m < 200; m++) {
    // Even step
    let num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m))
    d = 1 + num * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    d = 1 / d
    c = 1 + num / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    f *= c * d

    // Odd step
    num = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1))
    d = 1 + num * d
    if (Math.abs(d) < 1e-30) d = 1e-30
    d = 1 / d
    c = 1 + num / c
    if (Math.abs(c) < 1e-30) c = 1e-30
    const delta = c * d
    f *= delta
    if (Math.abs(delta - 1) < 1e-15) break
  }

  return front * f
}

/** Student's t CDF: P(T <= t) for given df. */
function tDistributionCDF(t: number, df: number): number {
  if (df <= 0) return 0.5
  const x = df / (df + t * t)
  const ibeta = regularizedIncompleteBeta(df / 2, 0.5, x)
  return t >= 0 ? 1 - 0.5 * ibeta : 0.5 * ibeta
}

/** Approximate inverse t-distribution via bisection (for confidence intervals). */
function tCriticalValue(alpha: number, df: number): number {
  let lo = 0
  let hi = 10
  while (tDistributionCDF(hi, df) < 1 - alpha) hi *= 2

  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (tDistributionCDF(mid, df) < 1 - alpha) {
      lo = mid
    } else {
      hi = mid
    }
    if (hi - lo < 1e-8) break
  }
  return (lo + hi) / 2
}
