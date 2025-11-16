/**
 * Code parser router
 * Routes files to appropriate language-specific parsers
 */

import { readFileSync } from 'fs';

import type { ParseResult } from '../types.js';

import { getLanguageForFile } from './languages.js';
import parseAssembly from './parsers/assembly.js';
import parseBash from './parsers/bash.js';
import parseCCpp from './parsers/c-cpp.js';
import parseClojure from './parsers/clojure.js';
import parseCobol from './parsers/cobol.js';
import parseCSharp from './parsers/csharp.js';
import parseDart from './parsers/dart.js';
import parseElixir from './parsers/elixir.js';
import parseFortran from './parsers/fortran.js';
import parseFSharp from './parsers/fsharp.js';
import parseGeneric from './parsers/generic.js';
import parseGo from './parsers/go.js';
import parseGroovy from './parsers/groovy.js';
import parseHaskell from './parsers/haskell.js';
import parseJava from './parsers/java.js';
import parseJavaScriptTypeScript from './parsers/javascript-typescript.js';
import parseJulia from './parsers/julia.js';
import parseKotlin from './parsers/kotlin.js';
import parseLisp from './parsers/lisp.js';
import parseLua from './parsers/lua.js';
import parseMatlab from './parsers/matlab.js';
import parseObjectiveC from './parsers/objective-c.js';
import parseOCaml from './parsers/ocaml.js';
import parsePerl from './parsers/perl.js';
import parsePHP from './parsers/php.js';
import parsePython from './parsers/python.js';
import parseR from './parsers/r.js';
import parseRuby from './parsers/ruby.js';
import parseRust from './parsers/rust.js';
import parseScala from './parsers/scala.js';
import parseSwift from './parsers/swift.js';

/**
 * Parse a source file and extract symbols and imports
 * Routes to appropriate language-specific parser based on file extension
 */
export function parseFile(filePath: string): ParseResult {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const language = getLanguageForFile(filePath);

    // Route to appropriate language parser
    switch (language) {
      case 'javascript':
      case 'typescript':
        return parseJavaScriptTypeScript(filePath, content, lines);
      case 'python':
        return parsePython(filePath, content, lines);
      case 'go':
        return parseGo(filePath, content, lines);
      case 'java':
        return parseJava(filePath, content, lines);
      case 'csharp':
        return parseCSharp(filePath, content, lines);
      case 'rust':
        return parseRust(filePath, content, lines);
      case 'ruby':
        return parseRuby(filePath, content, lines);
      case 'php':
        return parsePHP(filePath, content, lines);
      case 'c':
      case 'cpp':
        return parseCCpp(filePath, content, lines);
      case 'swift':
        return parseSwift(filePath, content, lines);
      case 'kotlin':
        return parseKotlin(filePath, content, lines);
      case 'scala':
        return parseScala(filePath, content, lines);
      case 'dart':
        return parseDart(filePath, content, lines);
      case 'r':
        return parseR(filePath, content, lines);
      case 'objc':
        return parseObjectiveC(filePath, content, lines);
      case 'bash':
        return parseBash(filePath, content, lines);
      case 'perl':
        return parsePerl(filePath, content, lines);
      case 'lua':
        return parseLua(filePath, content, lines);
      case 'elixir':
        return parseElixir(filePath, content, lines);
      case 'clojure':
        return parseClojure(filePath, content, lines);
      case 'haskell':
        return parseHaskell(filePath, content, lines);
      case 'ocaml':
        return parseOCaml(filePath, content, lines);
      case 'fsharp':
        return parseFSharp(filePath, content, lines);
      case 'julia':
        return parseJulia(filePath, content, lines);
      case 'groovy':
        return parseGroovy(filePath, content, lines);
      case 'matlab':
        return parseMatlab(filePath, content, lines);
      case 'fortran':
        return parseFortran(filePath, content, lines);
      case 'cobol':
        return parseCobol(filePath, content, lines);
      case 'assembly':
        return parseAssembly(filePath, content, lines);
      case 'lisp':
      case 'commonlisp':
      case 'scheme':
      case 'racket':
        return parseLisp(filePath, content, lines);
      default:
        return parseGeneric(filePath, content, lines);
    }
  } catch {
    return { symbols: [], imports: [] };
  }
}
