import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { NewsItem } from '../lib/news';

interface NewsCardProps {
  newsItem: NewsItem;
}

export function NewsCard({ newsItem }: NewsCardProps) {
  const handlePress = async () => {
    if (newsItem.link) {
      await WebBrowser.openBrowserAsync(newsItem.link);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.content}>
        <View style={styles.textContent}>
          <Text style={styles.title} numberOfLines={2}>
            {newsItem.title}
          </Text>
          <Text style={styles.description} numberOfLines={3}>
            {newsItem.description.replace(/<[^>]*>/g, '')}
          </Text>
          <Text style={styles.date}>
            {formatDate(newsItem.pubDate)}
          </Text>
        </View>
        {newsItem.imageUrl && (
          <Image
            source={{ uri: newsItem.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    padding: 12,
  },
  textContent: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
});

