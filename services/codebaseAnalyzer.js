/**
 * Codebase Analyzer Service
 * Analyzes codebase structure, files, and provides insights
 */

const analyzeCodebase = async (codebase) => {
  try {
    // Handle different input formats
    let files = [];
    
    if (typeof codebase === 'string') {
      // If codebase is a single string, try to parse it as JSON
      try {
        const parsed = JSON.parse(codebase);
        files = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        // If not JSON, treat as single file content
        files = [{ path: 'file', content: codebase }];
      }
    } else if (Array.isArray(codebase)) {
      files = codebase;
    } else if (typeof codebase === 'object') {
      files = [codebase];
    }

    const analysis = {
      summary: {
        totalFiles: files.length,
        analyzedAt: new Date().toISOString()
      },
      files: [],
      statistics: {
        totalLines: 0,
        totalSize: 0,
        fileTypes: {},
        languages: {}
      },
      insights: []
    };

    // Analyze each file
    for (const file of files) {
      const filePath = file.path || file.name || 'unknown';
      const fileContent = file.content || file.code || '';
      
      const fileAnalysis = analyzeFile(filePath, fileContent);
      analysis.files.push(fileAnalysis);
      
      // Update statistics
      analysis.statistics.totalLines += fileAnalysis.lines;
      analysis.statistics.totalSize += fileAnalysis.size;
      
      const extension = getFileExtension(filePath);
      if (extension) {
        analysis.statistics.fileTypes[extension] = 
          (analysis.statistics.fileTypes[extension] || 0) + 1;
      }
      
      const language = detectLanguage(filePath, fileContent);
      if (language) {
        analysis.statistics.languages[language] = 
          (analysis.statistics.languages[language] || 0) + 1;
      }
    }

    // Generate insights
    analysis.insights = generateInsights(analysis);

    return analysis;
  } catch (error) {
    throw new Error(`Codebase analysis failed: ${error.message}`);
  }
};

const analyzeFile = (filePath, content) => {
  const lines = content.split('\n');
  const size = Buffer.byteLength(content, 'utf8');
  
  // Count code metrics
  const codeLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
  }).length;
  
  const commentLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
  }).length;
  
  const blankLines = lines.filter(line => line.trim().length === 0).length;
  
  // Detect complexity indicators
  const hasFunctions = /function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*\{/g.test(content);
  const hasClasses = /class\s+\w+/g.test(content);
  const hasImports = /import\s+.*from|require\(/g.test(content);
  const hasExports = /export\s+|module\.exports/g.test(content);
  
  // Count common patterns
  const functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*\{/g) || []).length;
  const classCount = (content.match(/class\s+\w+/g) || []).length;
  const importCount = (content.match(/import\s+.*from|require\(/g) || []).length;

  return {
    path: filePath,
    lines: lines.length,
    size: size,
    codeLines: codeLines,
    commentLines: commentLines,
    blankLines: blankLines,
    metrics: {
      hasFunctions,
      hasClasses,
      hasImports,
      hasExports,
      functionCount,
      classCount,
      importCount
    },
    language: detectLanguage(filePath, content)
  };
};

const getFileExtension = (filePath) => {
  const match = filePath.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : null;
};

const detectLanguage = (filePath, content) => {
  const extension = getFileExtension(filePath);
  
  const languageMap = {
    'js': 'JavaScript',
    'jsx': 'JavaScript',
    'ts': 'TypeScript',
    'tsx': 'TypeScript',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'cs': 'C#',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'yml': 'YAML',
    'md': 'Markdown',
    'sh': 'Shell',
    'sql': 'SQL'
  };
  
  if (extension && languageMap[extension]) {
    return languageMap[extension];
  }
  
  // Fallback: detect by content patterns
  if (/function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=/.test(content)) {
    return 'JavaScript';
  }
  if (/def\s+\w+\s*\(|import\s+\w+|class\s+\w+/.test(content)) {
    return 'Python';
  }
  
  return 'Unknown';
};

const generateInsights = (analysis) => {
  const insights = [];
  
  if (analysis.summary.totalFiles === 0) {
    insights.push({
      type: 'warning',
      message: 'No files found in codebase'
    });
    return insights;
  }
  
  // File count insights
  if (analysis.summary.totalFiles > 100) {
    insights.push({
      type: 'info',
      message: `Large codebase detected with ${analysis.summary.totalFiles} files`
    });
  }
  
  // Language diversity
  const languageCount = Object.keys(analysis.statistics.languages).length;
  if (languageCount > 3) {
    insights.push({
      type: 'info',
      message: `Multi-language project detected with ${languageCount} different languages`
    });
  }
  
  // Most common file type
  const mostCommonType = Object.entries(analysis.statistics.fileTypes)
    .sort((a, b) => b[1] - a[1])[0];
  if (mostCommonType) {
    insights.push({
      type: 'info',
      message: `Most common file type: .${mostCommonType[0]} (${mostCommonType[1]} files)`
    });
  }
  
  // Average file size
  const avgFileSize = analysis.statistics.totalSize / analysis.summary.totalFiles;
  if (avgFileSize > 10000) {
    insights.push({
      type: 'warning',
      message: 'Some files are quite large. Consider splitting them for better maintainability.'
    });
  }
  
  // Files with many functions
  const complexFiles = analysis.files.filter(f => f.metrics.functionCount > 10);
  if (complexFiles.length > 0) {
    insights.push({
      type: 'warning',
      message: `${complexFiles.length} file(s) have more than 10 functions. Consider refactoring.`
    });
  }
  
  return insights;
};

module.exports = {
  analyzeCodebase
};

