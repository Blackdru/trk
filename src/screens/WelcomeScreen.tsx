import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

interface Props {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: Props) {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    {
      icon: 'shield',
      title: 'Welcome to UPI Tracker',
      description: 'Your personal subscription manager that helps you track and manage all your recurring payments.',
      color: '#8B5CF6', // Purple matching app
    },
    {
      icon: 'message-square',
      title: 'SMS Permission Required',
      description: 'We need access to your SMS messages to automatically detect UPI subscription payments from bank notifications.',
      color: '#10B981', // Green
      details: [
        'Only UPI transaction messages are read',
        'All processing happens locally on your device',
        'No SMS data is sent to external servers',
        'You can revoke permission anytime',
      ],
    },
    {
      icon: 'bell',
      title: 'Notification Permission',
      description: 'Get timely reminders before your subscriptions renew so you never miss a payment.',
      color: '#F59E0B', // Amber
      details: [
        'Reminders 2 days before renewal',
        'Customizable per subscription',
        'Helps avoid unexpected charges',
        'Can be disabled anytime',
      ],
    },
    {
      icon: 'lock',
      title: 'Your Privacy Matters',
      description: 'We take your privacy seriously. Here\'s our commitment to you:',
      color: '#8B5CF6', // Purple matching app
      details: [
        'All data stored locally on your device',
        'No data shared with third parties',
        'Encrypted local storage',
        'You control your data completely',
      ],
    },
  ];

  const currentPageData = pages[currentPage];
  const isLastPage = currentPage === pages.length - 1;

  const handleNext = () => {
    if (isLastPage) {
      onComplete();
    } else {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSkip = () => {
    setCurrentPage(pages.length - 1);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={[styles.iconWrapper, { backgroundColor: currentPageData.color + '20' }]}>
          <Icon name={currentPageData.icon} size={64} color={currentPageData.color} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{currentPageData.title}</Text>

        {/* Description */}
        <Text style={styles.description}>{currentPageData.description}</Text>

        {/* Details List */}
        {currentPageData.details && (
          <View style={styles.detailsContainer}>
            {currentPageData.details.map((detail, index) => (
              <View key={index} style={styles.detailItem}>
                <View style={styles.bulletPoint}>
                  <Icon name="check" size={16} color={currentPageData.color} />
                </View>
                <Text style={styles.detailText}>{detail}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Page Indicators */}
        <View style={styles.indicators}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentPage && styles.indicatorActive,
                { backgroundColor: index === currentPage ? currentPageData.color : '#E6E8EC' },
              ]}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.footer}>
        {!isLastPage && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: currentPageData.color }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {isLastPage ? 'Get Started' : 'Next'}
          </Text>
          <Icon name={isLastPage ? 'check' : 'arrow-right'} size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Legal Notice */}
      {isLastPage && (
        <View style={styles.legalNotice}>
          <Text style={styles.legalText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
            You can manage permissions in Settings anytime.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#18181B',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.6,
  },
  description: {
    fontSize: 16,
    color: '#52525B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bulletPoint: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 1,
  },
  detailText: {
    flex: 1,
    fontSize: 15,
    color: '#18181B',
    lineHeight: 22,
    fontWeight: '500',
  },
  indicators: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorActive: {
    width: 28,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 28,
    paddingVertical: 18,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717A',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  legalNotice: {
    paddingHorizontal: 28,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF',
  },
  legalText: {
    fontSize: 12,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 18,
  },
});
