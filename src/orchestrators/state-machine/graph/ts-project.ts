import { Project } from 'ts-morph'

/**
 * One shared in-memory TypeScript project for all AST work. `<script setup>` bodies
 * and individual guard expressions are parsed with the real compiler (ts-morph),
 * never with regexes.
 */
export const tsProject = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: { allowJs: true, checkJs: false }
})

let counter = 0

/** Parse a snippet into a throwaway source file. Names are unique to avoid clobbering. */
export function sourceFor (code: string): ReturnType<Project['createSourceFile']> {
  return tsProject.createSourceFile(`__n${counter++}.ts`, code, { overwrite: true })
}
