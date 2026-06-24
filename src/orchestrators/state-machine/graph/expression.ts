import { Node, type Node as TsNode } from 'ts-morph'
import { sourceFor } from './ts-project'
import type { ExprRefs, AccessChain } from './types'

function leftmostRoot (expr: TsNode): string {
  let e = expr
  while (Node.isPropertyAccessExpression(e) || Node.isElementAccessExpression(e) || Node.isCallExpression(e)) {
    e = e.getExpression()
  }
  return e.getText()
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
    accesses.push({ root: leftmostRoot(node.getExpression()), leaf: node.getName() })
  }

  return { roots: [...roots], accesses }
}

/**
 * Parse one template/script expression into the symbols it reads.
 * `errors.email` → roots ['errors'], accesses [{root:'errors', leaf:'email'}]
 */
export function analyzeExpression (expr: string): ExprRefs {
  if (!expr.trim()) return { roots: [], accesses: [] }
  let init
  try {
    init = sourceFor(`const __x = (${expr})`).getVariableDeclarations()[0]?.getInitializer()
  } catch {
    return { roots: [], accesses: [] }
  }
  return init ? refsOfNode(init) : { roots: [], accesses: [] }
}
