import { Node, SyntaxKind, type Node as TsNode } from 'ts-morph'
import { sourceFor } from './ts-project'
import type { ExprRefs, AccessChain, Comparison } from './types'

function leftmostRoot (expr: TsNode): string {
  let e = expr
  while (Node.isPropertyAccessExpression(e) || Node.isElementAccessExpression(e) || Node.isCallExpression(e)) {
    e = e.getExpression()
  }
  return e.getText()
}

/**
 * Decompose a property-access chain into its FULL path, preserving every segment.
 * `store.reservation.status` → root 'store', path ['reservation','status'].
 * Stops descending through call/element access (keeps the structural prefix).
 */
function decomposeAccess (node: TsNode): AccessChain | null {
  if (!Node.isPropertyAccessExpression(node)) return null
  const segments: string[] = []
  let e: TsNode = node
  while (Node.isPropertyAccessExpression(e)) {
    segments.unshift(e.getName())
    e = e.getExpression()
  }
  // skip leading call/element access noise but keep the identifier root
  while (Node.isCallExpression(e) || Node.isElementAccessExpression(e)) {
    e = e.getExpression()
  }
  const root = e.getText()
  // drop trailing structural-only leaves that aren't real fields (.length stays — it's meaningful)
  const path = segments
  const full = [root, ...path].join('.')
  return { root, path, leaf: path[path.length - 1] ?? root, full }
}

/** Extract the symbols read anywhere within (and including) an AST node. */
export function refsOfNode (root: TsNode): ExprRefs {
  const nodes = [root, ...root.getDescendants()]

  const roots = new Set<string>()
  for (const node of nodes) {
    if (!Node.isIdentifier(node)) continue
    const parent = node.getParent()
    if (Node.isPropertyAccessExpression(parent) && parent.getNameNode() === node) continue // member name in a.b
    if (Node.isPropertyAssignment(parent) && parent.getNameNode() === node) continue // key in { a: ... }
    roots.add(node.getText())
  }

  const accesses: AccessChain[] = []
  for (const node of nodes) {
    if (!Node.isPropertyAccessExpression(node)) continue
    if (Node.isPropertyAccessExpression(node.getParent())) continue // only maximal chains
    const chain = decomposeAccess(node)
    if (chain) accesses.push(chain)
  }

  const comparisons = extractComparisons(root)

  return { roots: [...roots], accesses, comparisons }
}

const COMPARISON_OPS: Record<string, string> = {
  [SyntaxKind.EqualsEqualsEqualsToken]: '===',
  [SyntaxKind.EqualsEqualsToken]: '==',
  [SyntaxKind.ExclamationEqualsEqualsToken]: '!==',
  [SyntaxKind.ExclamationEqualsToken]: '!=',
  [SyntaxKind.GreaterThanToken]: '>',
  [SyntaxKind.GreaterThanEqualsToken]: '>=',
  [SyntaxKind.LessThanToken]: '<',
  [SyntaxKind.LessThanEqualsToken]: '<='
}

function accessTextOf (node: TsNode): string | null {
  if (Node.isPropertyAccessExpression(node)) {
    const chain = decomposeAccess(node)
    return chain?.full ?? null
  }
  if (Node.isIdentifier(node)) return node.getText()
  return null
}

/**
 * Pull the satisfying-assignment recipe out of a guard:
 *   `store.reservation.status === 'confirmed'` → { access, '===', 'confirmed' }
 *   `cart.items.length > 0`                    → { access, '>', '0' }
 *   `!checkout.isLocked`                        → { access, 'falsy', null }
 *   `store.isPremium`                           → { access, 'truthy', null }
 */
function extractComparisons (root: TsNode): Comparison[] {
  const out: Comparison[] = []
  const all = [root, ...root.getDescendants()]

  // binary comparisons
  for (const node of all) {
    if (!Node.isBinaryExpression(node)) continue
    const op = COMPARISON_OPS[node.getOperatorToken().getKind()]
    if (!op) continue
    const left = node.getLeft()
    const right = node.getRight()
    const leftAccess = accessTextOf(left)
    const rightAccess = accessTextOf(right)

    if (leftAccess && (Node.isStringLiteral(right) || Node.isNumericLiteral(right) || right.getKind() === SyntaxKind.TrueKeyword || right.getKind() === SyntaxKind.FalseKeyword)) {
      out.push({ access: leftAccess, operator: op, value: stripQuotes(right.getText()) })
    } else if (rightAccess && (Node.isStringLiteral(left) || Node.isNumericLiteral(left))) {
      out.push({ access: rightAccess, operator: flip(op), value: stripQuotes(left.getText()) })
    } else if (leftAccess && rightAccess) {
      out.push({ access: leftAccess, operator: op, value: rightAccess })
    }
  }

  // unary negation → falsy
  for (const node of all) {
    if (node.getKind() !== SyntaxKind.PrefixUnaryExpression) continue
    const u = node.asKindOrThrow(SyntaxKind.PrefixUnaryExpression)
    if (u.getOperatorToken() !== SyntaxKind.ExclamationToken) continue
    const access = accessTextOf(u.getOperand())
    if (access) out.push({ access, operator: 'falsy', value: null })
  }

  // bare truthy accesses used as operands of a logical && / || chain
  // (e.g. `meta.touched && !meta.valid` — meta.touched is a truthy operand)
  for (const node of all) {
    if (!Node.isBinaryExpression(node)) continue
    const opKind = node.getOperatorToken().getKind()
    if (opKind !== SyntaxKind.AmpersandAmpersandToken && opKind !== SyntaxKind.BarBarToken) continue
    for (const side of [node.getLeft(), node.getRight()]) {
      let s: TsNode = side
      if (Node.isParenthesizedExpression(s)) s = s.getExpression()
      if (Node.isIdentifier(s) || Node.isPropertyAccessExpression(s)) {
        const access = accessTextOf(s)
        if (access && !out.some((c) => c.access === access)) {
          out.push({ access, operator: 'truthy', value: null })
        }
      }
    }
  }

  // bare truthy access used directly as a guard: the whole expression is just
  // an identifier or a property-access chain (store.isPremium, isActive, a.b.c)
  let bare: TsNode = root
  if (Node.isParenthesizedExpression(bare)) bare = bare.getExpression()
  if (Node.isIdentifier(bare) || Node.isPropertyAccessExpression(bare)) {
    const topAccess = accessTextOf(bare)
    if (topAccess && !out.some((c) => c.access === topAccess)) {
      out.push({ access: topAccess, operator: 'truthy', value: null })
    }
  }

  return out
}

function stripQuotes (s: string): string {
  return s.replace(/^['"`]|['"`]$/g, '')
}

function flip (op: string): string {
  const map: Record<string, string> = { '>': '<', '>=': '<=', '<': '>', '<=': '>=' }
  return map[op] ?? op
}

/**
 * Parse one template/script expression into the symbols it reads.
 * `store.reservation.status === 'confirmed'` →
 *   roots ['store'], accesses [store.reservation.status],
 *   comparisons [{ access:'store.reservation.status', operator:'===', value:'confirmed' }]
 */
export function analyzeExpression (expr: string): ExprRefs {
  if (!expr.trim()) return { roots: [], accesses: [], comparisons: [] }
  let init
  try {
    init = sourceFor(`const __x = (${expr})`).getVariableDeclarations()[0]?.getInitializer()
  } catch {
    return { roots: [], accesses: [], comparisons: [] }
  }
  return init ? refsOfNode(init) : { roots: [], accesses: [], comparisons: [] }
}
