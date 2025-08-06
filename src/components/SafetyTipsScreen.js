import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';

export default function SafetyTipsScreen({ onBack }) {
  const { t } = useTranslation();
  const tips = t('safetyTips.tips', { returnObjects: true });
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Icon name="security" size={24} color="#6a1b9a" style={styles.headerIcon} />
          <Text style={styles.title}>{t('safetyTips.title')}</Text>
        </View>
        <TouchableOpacity onPress={onBack} style={styles.closeButton}>
          <Icon name="close" size={28} color="#6a1b9a" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {tips.map((tip, idx) => (
          <View key={idx} style={styles.tipBlock}>
            <View style={styles.tipHeader}>
              <Icon name="lightbulb-outline" size={20} color="#6a1b9a" style={styles.tipIcon} />
              <Text style={styles.tipTitle}>{tip.title}</Text>
            </View>
            <View style={styles.tipContent}>
              {tip.points.map((point, i) => (
                <View key={i} style={styles.pointContainer}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.tipPoint}>{point}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' ,
    paddingBottom: 80,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#fff',
    borderBottomWidth: 1, 
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 12,
  },
  title: { 
    fontSize: 22, 
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  content: { 
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  tipBlock: { 
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e8f4fd',
  },
  tipIcon: {
    marginRight: 8,
  },
  tipTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#6a1b9a',
    flex: 1,
  },
  tipContent: {
    paddingLeft: 4,
  },
  pointContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 16,
    color: '#6a1b9a',
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2,
    minWidth: 12,
  },
  tipPoint: { 
    fontSize: 15, 
    color: '#2c3e50',
    lineHeight: 22,
    flex: 1,
  },
}); 
