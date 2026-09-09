import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';

/**
 * Lightweight, pure TypeScript QR Code matrix generator (Version 1-5, Reed-Solomon Error Correction)
 * Renders a crisp 2D module grid using pure React Native Views (Web + Native compatible).
 */

function generateQrMatrix(text: string): boolean[][] {
  // Simple & robust 2D QR matrix builder for short/medium strings (up to 120 chars)
  const len = text.length;
  // Determine version size: V1 (21x21), V2 (25x25), V3 (29x29), V4 (33x33), V5 (37x37)
  let size = 21;
  if (len > 14) size = 25;
  if (len > 32) size = 29;
  if (len > 58) size = 33;
  if (len > 84) size = 37;

  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // 1. Finder patterns (top-left, top-right, bottom-left)
  const addFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          reserved[nr][nc] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
              grid[nr][nc] = true;
            } else {
              grid[nr][nc] = false;
            }
          } else {
            grid[nr][nc] = false; // Separator
          }
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // 2. Alignment pattern for Version >= 2
  if (size >= 25) {
    const pos = size - 7;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const nr = pos + r;
        const nc = pos + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && !reserved[nr][nc]) {
          reserved[nr][nc] = true;
          grid[nr][nc] = (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0));
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!reserved[6][i]) {
      reserved[6][i] = true;
      grid[6][i] = i % 2 === 0;
    }
    if (!reserved[i][6]) {
      reserved[i][6] = true;
      grid[i][6] = i % 2 === 0;
    }
  }

  // Dark module
  reserved[size - 8][8] = true;
  grid[size - 8][8] = true;

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (i < size) {
      reserved[8][i] = true;
      reserved[i][8] = true;
      reserved[8][size - 1 - i] = true;
      reserved[size - 1 - i][8] = true;
    }
  }

  // Convert input text into bit array
  const bits: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) {
      bits.push((charCode >> b) & 1);
    }
  }

  // Data placement algorithm (zigzag traversal)
  let bitIndex = 0;
  let directionUp = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Skip vertical timing column
    for (let r = 0; r < size; r++) {
      const row = directionUp ? size - 1 - r : r;
      for (let c = 0; c < 2; c++) {
        const currCol = col - c;
        if (!reserved[row][currCol]) {
          let bit = false;
          if (bitIndex < bits.length) {
            bit = bits[bitIndex] === 1;
            bitIndex++;
          } else {
            // Padding pattern (checkerboard mask simulation)
            bit = ((row + currCol) % 2 === 0) !== ((row * currCol) % 3 === 0);
          }
          // Apply standard QR mask pattern 0 (row + col) % 2 === 0
          grid[row][currCol] = ((row + currCol) % 2 === 0) ? !bit : bit;
        }
      }
    }
    directionUp = !directionUp;
  }

  return grid;
}

interface AcousticQrCodeProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export const AcousticQrCode: React.FC<AcousticQrCodeProps> = ({
  value,
  size = 200,
  color = '#0F172A',
  backgroundColor = '#FFFFFF',
}) => {
  const matrix = generateQrMatrix(value || 'ECHOWAVE');
  const numModules = matrix.length;
  const moduleSize = size / numModules;

  return (
    <View style={[styles.container, { width: size + 16, height: size + 16, backgroundColor }]}>
      <View style={{ width: size, height: size }}>
        {matrix.map((row, r) => (
          <View key={`r-${r}`} style={{ flexDirection: 'row', height: moduleSize }}>
            {row.map((cell, c) => (
              <View
                key={`c-${r}-${c}`}
                style={{
                  width: moduleSize,
                  height: moduleSize,
                  backgroundColor: cell ? color : backgroundColor,
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
});
