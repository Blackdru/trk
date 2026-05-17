# Requirements Document

## Introduction

This document specifies requirements for adding a native AI module to the UPI Autopay Tracker app. The AI module will replace or enhance the current rule-based SMS classifier with a lightweight on-device machine learning model that accurately classifies SMS messages into categories such as subscription, autopay, e-mandate, debit, P2P transfer, and others. The solution must prioritize user privacy by processing all SMS data entirely on-device without external transmission.

## Glossary

- **AI_Classifier**: The machine learning model and inference engine that classifies SMS messages into predefined categories
- **TFLite_Module**: The TensorFlow Lite native module that loads and executes the AI model on Android devices
- **SMS_Parser**: The existing TypeScript module that extracts transaction details from SMS messages
- **Training_Pipeline**: The offline process that trains the AI model using labeled SMS data
- **Model_File**: The binary file containing the trained TensorFlow Lite model (`.tflite` format)
- **Confidence_Score**: A numerical value between 0.0 and 1.0 indicating the model's certainty in its classification
- **Category**: One of the predefined SMS types: subscription, autopay, mandate, EMI, P2P transfer, debit, OTP, or unknown
- **Inference_Time**: The duration in milliseconds from when an SMS is provided to the model until a classification result is returned
- **MMKV_Storage**: The existing fast key-value storage system used by the app
- **Native_Bridge**: The React Native interface that connects TypeScript code to native Android modules
- **Feature_Vector**: The numerical representation of SMS text and metadata used as input to the AI model
- **Model_Updater**: The component responsible for replacing the existing model with a new version

## Requirements

### Requirement 1: On-Device Model Inference

**User Story:** As a user, I want my SMS messages to be classified entirely on my device, so that my private financial data never leaves my phone.

#### Acceptance Criteria

1. THE AI_Classifier SHALL process all SMS messages locally on the Android device
2. THE AI_Classifier SHALL NOT transmit any SMS content, metadata, or derived features to external servers
3. THE AI_Classifier SHALL NOT require internet connectivity to perform classification
4. WHEN the device is offline, THE AI_Classifier SHALL classify SMS messages with the same accuracy as when online
5. THE TFLite_Module SHALL load the Model_File from local device storage

### Requirement 2: Model Size Constraints

**User Story:** As a user, I want the AI model to have minimal storage footprint, so that it does not consume excessive device storage.

#### Acceptance Criteria

1. THE Model_File SHALL be less than 5 megabytes in size
2. WHEN the Model_File is loaded into memory, THE TFLite_Module SHALL consume less than 20 megabytes of RAM
3. THE Model_File SHALL use quantized weights to reduce file size
4. THE TFLite_Module SHALL release memory resources when classification is not actively being performed

### Requirement 3: Inference Performance

**User Story:** As a user, I want SMS classification to be fast, so that the app remains responsive when processing messages.

#### Acceptance Criteria

1. WHEN an SMS message is provided to the AI_Classifier, THE AI_Classifier SHALL return a classification result within 100 milliseconds
2. THE Inference_Time SHALL be measured from the moment the Feature_Vector is passed to the model until the Confidence_Score is returned
3. WHEN processing a batch of 100 SMS messages, THE AI_Classifier SHALL complete classification of all messages within 5 seconds
4. THE TFLite_Module SHALL use hardware acceleration when available on the device

### Requirement 4: Classification Categories

**User Story:** As a user, I want the AI to accurately identify different types of financial SMS messages, so that the app can properly track my subscriptions and payments.

#### Acceptance Criteria

1. THE AI_Classifier SHALL classify SMS messages into exactly one of the following categories: subscription, autopay, mandate, EMI, P2P transfer, debit, OTP, or unknown
2. WHEN an SMS contains subscription-related keywords and recurring payment indicators, THE AI_Classifier SHALL classify it as subscription
3. WHEN an SMS contains autopay setup or execution indicators, THE AI_Classifier SHALL classify it as autopay
4. WHEN an SMS contains e-mandate or standing instruction indicators, THE AI_Classifier SHALL classify it as mandate
5. WHEN an SMS contains EMI payment or loan installment indicators, THE AI_Classifier SHALL classify it as EMI
6. WHEN an SMS contains person-to-person transfer indicators, THE AI_Classifier SHALL classify it as P2P transfer
7. WHEN an SMS contains one-time password or verification code indicators, THE AI_Classifier SHALL classify it as OTP
8. WHEN an SMS contains generic debit indicators without recurring payment context, THE AI_Classifier SHALL classify it as debit
9. WHEN an SMS does not match any category patterns with sufficient confidence, THE AI_Classifier SHALL classify it as unknown

### Requirement 5: Confidence Scoring

**User Story:** As a developer, I want the AI to provide confidence scores with classifications, so that the app can handle uncertain classifications appropriately.

#### Acceptance Criteria

1. THE AI_Classifier SHALL return a Confidence_Score between 0.0 and 1.0 for each classification
2. WHEN the AI_Classifier is highly certain of a classification, THE Confidence_Score SHALL be greater than 0.85
3. WHEN the AI_Classifier is uncertain of a classification, THE Confidence_Score SHALL be less than 0.65
4. THE AI_Classifier SHALL provide Confidence_Score values for all categories, not only the predicted category
5. THE SMS_Parser SHALL reject classifications where the Confidence_Score is below a configurable threshold

### Requirement 6: Integration with Existing SMS Parser

**User Story:** As a developer, I want the AI classifier to integrate seamlessly with the existing SMS parsing pipeline, so that minimal code changes are required.

#### Acceptance Criteria

1. THE AI_Classifier SHALL accept the same RawSms input format as the existing rule-based classifier
2. THE AI_Classifier SHALL return a ClassificationResult with the same structure as the existing classifier
3. THE SMS_Parser SHALL be able to switch between rule-based and AI-based classification through a configuration flag
4. WHEN AI classification is enabled, THE SMS_Parser SHALL use the AI_Classifier instead of the rule-based classifier
5. WHEN AI classification fails or is unavailable, THE SMS_Parser SHALL fall back to the rule-based classifier

### Requirement 7: Model Accuracy

**User Story:** As a user, I want the AI classifier to be more accurate than the rule-based approach, so that fewer irrelevant SMS messages are incorrectly classified.

#### Acceptance Criteria

1. THE AI_Classifier SHALL achieve at least 90% accuracy on a test set of Indian banking SMS messages
2. THE AI_Classifier SHALL achieve at least 85% precision for the subscription category
3. THE AI_Classifier SHALL achieve at least 85% recall for the subscription category
4. THE AI_Classifier SHALL correctly reject at least 95% of P2P transfer messages
5. THE AI_Classifier SHALL correctly reject at least 98% of OTP messages
6. WHEN tested against the same SMS dataset, THE AI_Classifier SHALL demonstrate higher F1 score than the rule-based classifier

### Requirement 8: Native Module Implementation

**User Story:** As a developer, I want the AI inference to run in native code, so that performance is optimized for mobile devices.

#### Acceptance Criteria

1. THE TFLite_Module SHALL be implemented as a React Native native module for Android
2. THE TFLite_Module SHALL use the TensorFlow Lite Android library for model inference
3. THE Native_Bridge SHALL expose a TypeScript interface for invoking classification from JavaScript
4. THE TFLite_Module SHALL initialize the model during app startup
5. WHEN the Model_File is missing or corrupted, THE TFLite_Module SHALL throw an error that can be caught by the SMS_Parser
6. THE TFLite_Module SHALL follow the same architectural pattern as existing native modules (SmsModule, AlarmModule, LaunchIntent)

### Requirement 9: Feature Extraction

**User Story:** As a developer, I want the AI model to use meaningful features from SMS messages, so that classification is based on relevant patterns.

#### Acceptance Criteria

1. THE AI_Classifier SHALL extract text features from the SMS body including keywords, patterns, and n-grams
2. THE AI_Classifier SHALL extract metadata features including sender ID, message length, and timestamp
3. THE AI_Classifier SHALL normalize currency amounts to a standard range before feeding to the model
4. THE AI_Classifier SHALL tokenize SMS text using a vocabulary optimized for Indian banking terminology
5. THE Feature_Vector SHALL have a fixed dimension compatible with the model input layer
6. WHEN an SMS contains unknown words not in the vocabulary, THE AI_Classifier SHALL use an unknown token representation

### Requirement 10: Model Training Pipeline

**User Story:** As a developer, I want a reproducible training pipeline, so that the model can be retrained with new data.

#### Acceptance Criteria

1. THE Training_Pipeline SHALL accept labeled SMS data in CSV or JSON format
2. THE Training_Pipeline SHALL split data into training, validation, and test sets
3. THE Training_Pipeline SHALL train a model using TensorFlow or PyTorch
4. THE Training_Pipeline SHALL export the trained model in TensorFlow Lite format
5. THE Training_Pipeline SHALL generate a classification report showing accuracy, precision, recall, and F1 score for each category
6. THE Training_Pipeline SHALL apply data augmentation techniques to increase training data diversity
7. THE Training_Pipeline SHALL save the trained Model_File to a location accessible by the Android build process

### Requirement 11: Model Deployment

**User Story:** As a developer, I want the trained model to be bundled with the app, so that it is available immediately after installation.

#### Acceptance Criteria

1. THE Model_File SHALL be included in the Android app assets during the build process
2. THE TFLite_Module SHALL copy the Model_File from assets to internal storage on first launch
3. THE TFLite_Module SHALL verify the Model_File integrity using a checksum before loading
4. WHEN the Model_File checksum does not match the expected value, THE TFLite_Module SHALL log an error and fall back to rule-based classification
5. THE Android build configuration SHALL include the Model_File in the APK

### Requirement 12: Model Updates

**User Story:** As a developer, I want the ability to update the AI model without releasing a new app version, so that classification accuracy can be improved over time.

#### Acceptance Criteria

1. THE Model_Updater SHALL check MMKV_Storage for a newer Model_File version on app startup
2. WHEN a newer Model_File is found in MMKV_Storage, THE Model_Updater SHALL replace the active model
3. THE Model_Updater SHALL validate the new Model_File format before replacing the active model
4. WHEN Model_File replacement fails, THE Model_Updater SHALL retain the previous working model
5. THE Model_Updater SHALL log model version information for debugging purposes

### Requirement 13: Indian Banking SMS Support

**User Story:** As a user in India, I want the AI to understand SMS formats from Indian banks and UPI apps, so that my transactions are accurately classified.

#### Acceptance Criteria

1. THE AI_Classifier SHALL recognize SMS patterns from major Indian banks including SBI, HDFC, ICICI, Axis, and Kotak
2. THE AI_Classifier SHALL recognize SMS patterns from UPI apps including PhonePe, Google Pay, Paytm, and BHIM
3. THE AI_Classifier SHALL handle Indian currency formats including Rs., Rs, INR, and ₹ symbols
4. THE AI_Classifier SHALL recognize Indian date formats including DD/MM/YYYY and DD-MMM-YY
5. THE AI_Classifier SHALL handle mixed English and Hindi text in SMS messages
6. THE Training_Pipeline SHALL include SMS samples from at least 10 different Indian banks and 5 UPI apps

### Requirement 14: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can diagnose classification issues.

#### Acceptance Criteria

1. WHEN the TFLite_Module encounters an error during inference, THE TFLite_Module SHALL log the error message and return a classification of unknown with Confidence_Score 0.0
2. WHEN the Model_File fails to load, THE TFLite_Module SHALL log the failure reason and notify the SMS_Parser to use fallback classification
3. THE AI_Classifier SHALL log the classification result, Confidence_Score, and inference time for each SMS
4. THE AI_Classifier SHALL log feature extraction failures without crashing the app
5. WHEN classification takes longer than 200 milliseconds, THE AI_Classifier SHALL log a performance warning

### Requirement 15: Testing and Validation

**User Story:** As a developer, I want comprehensive tests for the AI classifier, so that regressions are caught before release.

#### Acceptance Criteria

1. THE AI_Classifier SHALL have unit tests that verify classification accuracy on known SMS samples
2. THE TFLite_Module SHALL have integration tests that verify native module initialization and inference
3. THE Training_Pipeline SHALL have tests that verify model export and format compatibility
4. THE AI_Classifier SHALL have performance tests that verify Inference_Time meets the 100ms requirement
5. THE AI_Classifier SHALL have tests that verify fallback to rule-based classification when the model is unavailable
