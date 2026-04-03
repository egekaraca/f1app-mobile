import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';

interface ConstructorLogoSVGProps {
  source: any;
  width?: number;
  height?: number;
}

/**
 * Constructor logos display component
 * Handles both SVG components and regular image sources
 */
export function ConstructorLogo({ 
  source, 
  width = 207, 
  height = 207
}: ConstructorLogoSVGProps) {
  // Check if source is a React component (SVG) by checking if it's callable
  if (typeof source === 'function') {
    const SvgComponent = source;
    return (
      <View style={{ 
        width, 
        height, 
        justifyContent: 'center', 
        alignItems: 'center',
      }}>
        <SvgComponent width={width} height={height} />
      </View>
    );
  }
  
  // Regular image source
  return (
    <View style={{ 
      width, 
      height, 
      justifyContent: 'center', 
      alignItems: 'center',
    }}>
      <Image
        source={source as ImageSourcePropType}
        style={{ width, height }}
        resizeMode="contain"
      />
    </View>
  );
}

