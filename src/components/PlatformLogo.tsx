import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Platform } from '../types';
import { PLATFORM_CONFIG } from '../constants';

const PLATFORM_IMAGES: Record<Platform, ReturnType<typeof require>> = {
  swiggy: require('../../assets/platforms/swiggy.jpg'),
  zomato: require('../../assets/platforms/zomato.png'),
  blinkit: require('../../assets/platforms/blinkit.jpg'),
  bigbasket: require('../../assets/platforms/bigbasket.jpg'),
  zepto: require('../../assets/platforms/zepto.jpg'),
};

interface PlatformLogoProps {
  platform: Platform;
  size?: 'small' | 'regular' | 'large';
}

export function PlatformLogo({ platform, size = 'regular' }: PlatformLogoProps) {
  const cfg = PLATFORM_CONFIG[platform];
  const [imageError, setImageError] = useState(false);

  const getSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 40;
      default: return 28;
    }
  };

  const logoSize = getSize();

  if (imageError) {
    // Fallback to emoji if image fails to load
    return (
      <View
        style={[
          styles.logoContainer,
          {
            width: logoSize,
            height: logoSize,
            borderRadius: logoSize / 4,
            backgroundColor: cfg.color,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Text style={{ fontSize: logoSize * 0.5 }}>{cfg.emoji}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.logoContainer,
        {
          width: logoSize,
          height: logoSize,
          borderRadius: logoSize / 4,
          backgroundColor: 'transparent',
        },
      ]}
    >
      <Image
        source={PLATFORM_IMAGES[platform]}
        style={{ width: logoSize * 0.8, height: logoSize * 0.8 }}
        resizeMode="contain"
        onError={() => {
          setImageError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});