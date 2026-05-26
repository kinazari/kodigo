import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';

import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture
} from 'react-native-gesture-handler';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* =========================
UP THEME COLOR PALETTE
========================= */

const COLORS = {
  primary: '#7B1113',
  secondary: '#014421',
  accent: '#FFB81C',
  backgroundGradient: ['#F4F1EA', '#E0DCCF'],
  textDark: '#1A1A1A',
  textLight: '#FFFFFF',
  pass: '#4A4A4A',
  save: '#014421',
};

/* =========================
APP HEADER
========================= */

const AppHeader = ({
  title = 'KODIGO',
  subtitle = 'UNIVERSITY ELECTION ASSISTANT'
}) => (
  <View style={styles.headerContainer}>
    <View style={styles.headerRow}>
      <Image
        source={{
          uri: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png'
        }}
        style={[
          styles.logoImage,
          { tintColor: COLORS.primary }
        ]}
      />

      <Text style={styles.appTitle}>
        {title}
      </Text>
    </View>

    {subtitle ? (
      <Text style={styles.headerSubtitle}>
        {subtitle}
      </Text>
    ) : null}
  </View>
);

/* =========================
HELPERS
========================= */

const convertDriveLinkToDirect = (url) => {
  if (!url || typeof url !== 'string') return url;

  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);

    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }

  return url;
};

const shuffleArray = (array) => {
  let shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i]
    ];
  }

  return shuffled;
};

const randomizeByPosition = (candidates) => {
  const positions = [
    ...new Set(candidates.map(c => c.position))
  ];

  let randomizedDeck = [];

  positions.forEach(pos => {
    const candidatesInPos = candidates.filter(
      c => c.position === pos
    );

    randomizedDeck = [
      ...randomizedDeck,
      ...shuffleArray(candidatesInPos)
    ];
  });

  return randomizedDeck;
};

/* =========================
SWIPEABLE CARD
========================= */

const SwipeableCard = ({
  candidate,
  onSwipeRight,
  onSwipeLeft,
  isTop,
  onOpenModal
}) => {

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const context = useSharedValue({
    x: 0,
    y: 0
  });

  const panGesture = Gesture.Pan()
    .enabled(isTop)

    .onStart(() => {
      context.value = {
        x: translateX.value,
        y: translateY.value
      };
    })

    .onUpdate((event) => {
      translateX.value =
        event.translationX + context.value.x;

      translateY.value =
        event.translationY + context.value.y;
    })

    .onEnd((event) => {
      const swipeThreshold = SCREEN_WIDTH * 0.35;

      if (translateX.value > swipeThreshold) {
        translateX.value = withSpring(
          SCREEN_WIDTH + 150,
          { velocity: event.velocityX },
          () => {
            runOnJS(onSwipeRight)();
          }
        );

      } else if (
        translateX.value < -swipeThreshold
      ) {

        translateX.value = withSpring(
          -SCREEN_WIDTH - 150,
          { velocity: event.velocityX },
          () => {
            runOnJS(onSwipeLeft)();
          }
        );

      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, SCREEN_WIDTH],
      [-12, 12],
      Extrapolate.CLAMP
    );

    const scale = isTop ? 1 : 0.94;
    const topOffset = isTop ? 0 : 15;

    return {
      position: 'absolute',
      width: '100%',
      height: '100%',
      top: topOffset,

      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: withTiming(scale) }
      ],

      zIndex: isTop ? 100 : 0,
    };
  });

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-50, -120],
      [0, 1],
      Extrapolate.CLAMP
    )
  }));

  const saveOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [50, 120],
      [0, 1],
      Extrapolate.CLAMP
    )
  }));

  const partyName =
    candidate.party || candidate.partylist;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <View style={styles.card}>
          <ImageBackground
            source={{ uri: candidate.image }}
            style={styles.imageBackground}
          >
            <LinearGradient
              colors={[
                'transparent',
                'rgba(0,0,0,0.6)',
                'rgba(0,0,0,0.95)'
              ]}
              style={styles.textContainer}
            >

              {partyName ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {partyName}
                  </Text>
                </View>
              ) : null}

              <Text style={styles.nameText}>
                {candidate.name}
              </Text>

              <Text style={styles.positionText}>
                {candidate.position}
              </Text>

              <Text
                style={styles.summaryText}
                numberOfLines={2}
              >
                {candidate.summary}
              </Text>

              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() =>
                  onOpenModal(candidate)
                }
              >
                <Text style={styles.dropdownButtonText}>
                  VIEW PLATFORM
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </ImageBackground>
        </View>

        <Animated.View
          style={[
            styles.overlayLabel,
            {
              right: 20,
              backgroundColor: COLORS.pass
            },
            passOpacity
          ]}
        >
          <Text style={styles.swipeLabelText}>
            PASS
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.overlayLabel,
            {
              left: 20,
              backgroundColor: COLORS.save
            },
            saveOpacity
          ]}
        >
          <Text style={styles.swipeLabelText}>
            SAVE
          </Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

/* =========================
MAIN APP
========================= */

export default function App() {

  const [deck, setDeck] = useState([]);
  const [kodigo, setKodigo] = useState([]);
  const [history, setHistory] = useState([]);

  const [isFinished, setIsFinished] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [masterDeck, setMasterDeck] =
    useState([]);

  const [hasStarted, setHasStarted] =
    useState(false);

  const [
    selectedCandidateForModal,
    setSelectedCandidateForModal
  ] = useState(null);

  const GOOGLE_SHEET_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJluE0yclSap4l-Bq4Tp5aO3bGeJvQpNPQM4DsY2Xu0mPzPuO0uYeZ2xzq6rTwy8oahRL6jontAALk/pub?output=csv';

  /* =========================
  FETCH DATA
  ========================= */

  useEffect(() => {
    Papa.parse(GOOGLE_SHEET_URL, {
      download: true,
      header: true,

      complete: (results) => {

        const validCandidates = results.data
          .filter(c => c.name && c.position)

          .map((c, index) => ({
            ...c,

            id: `id_${index}_${Date.now()}`,

            image: convertDriveLinkToDirect(
              c.image
            ),

            party:
              c.party || c.partylist || ''
          }));

        const randomized =
          randomizeByPosition(validCandidates);

        setMasterDeck(validCandidates);
        setDeck(randomized);

        setIsLoading(false);
      },

      error: () => {
        Alert.alert(
          'Error',
          'Could not connect to Google Sheets.'
        );

        setIsLoading(false);
      }
    });
  }, []);

  /* =========================
  SWIPE RIGHT
  ========================= */

  const handleSwipeRight = () => {

    const selected = deck[0];

    if (!selected) return;

    // SAVE HISTORY

    setHistory(prev => [
      ...prev,
      {
        deck: [...deck],
        kodigo: [...kodigo],
        isFinished
      }
    ]);

    const normalizedPosition =
      selected.position
        .trim()
        .toLowerCase();

    const updatedKodigo = [
      ...kodigo,
      selected
    ];

    setKodigo(updatedKodigo);

    const countForPosition =
      updatedKodigo.filter(
        c =>
          c.position
            .trim()
            .toLowerCase() ===
          normalizedPosition
      ).length;

    const limits = {
      chairperson: 1,
      'vice chairperson': 1,
      'vice-chairperson': 1,
      councilor: 8,
      councilors: 8,
      president: 1,
      'vice president': 1,
      senator: 12
    };

    const limit =
      limits[normalizedPosition] || Infinity;

    let nextDeck = deck.slice(1);

    if (countForPosition >= limit) {
      nextDeck = nextDeck.filter(
        c =>
          c.position
            .trim()
            .toLowerCase() !==
          normalizedPosition
      );
    }

    setDeck(nextDeck);

    if (nextDeck.length === 0) {
      setIsFinished(true);
    }
  };

  /* =========================
  SWIPE LEFT
  ========================= */

  const handleSwipeLeft = () => {

    // SAVE HISTORY

    setHistory(prev => [
      ...prev,
      {
        deck: [...deck],
        kodigo: [...kodigo],
        isFinished
      }
    ]);

    const nextDeck = deck.slice(1);

    setDeck(nextDeck);

    if (nextDeck.length === 0) {
      setIsFinished(true);
    }
  };

  /* =========================
  UNDO
  ========================= */

  const handleUndo = () => {

    if (history.length === 0) return;

    const previousState =
      history[history.length - 1];

    setDeck(previousState.deck);

    setKodigo(previousState.kodigo);

    setIsFinished(previousState.isFinished);

    setHistory(prev => prev.slice(0, -1));
  };

  /* =========================
  RESET
  ========================= */

  const handleForceReset = () => {

    setKodigo([]);
    setHistory([]);

    setDeck(
      randomizeByPosition(masterDeck)
    );

    setIsFinished(false);

    setHasStarted(false);
  };

  const handleRetry = () => {

    setKodigo([]);
    setHistory([]);

    setDeck(
      randomizeByPosition(masterDeck)
    );

    setIsFinished(false);
  };

  /* =========================
  EXPORT PDF
  ========================= */

  const exportToPDF = async () => {

    try {

      const htmlContent = `
        <html>
        <body style="font-family: Helvetica; padding: 40px;">

          <h1 style="color: ${COLORS.primary}; text-align: center;">
            UP Official Election Kodigo
          </h1>

          <p style="text-align: center; color: #666;">
            Dangal at Husay. Bumoto nang Tama.
          </p>

          <hr/>

          ${kodigo.map(c => `
            <div style="padding: 15px 0; border-bottom: 1px solid #ddd;">
              
              <span style="color: ${COLORS.primary}; font-weight: bold; text-transform: uppercase; font-size: 12px;">
                ${c.position}
              </span>

              <br/>

              <span style="font-size: 18px;">
                ${c.name}
              </span>

              <span style="color: ${COLORS.secondary}; font-weight: bold;">
                ${c.party ? `(${c.party})` : ''}
              </span>

            </div>
          `).join('')}

        </body>
        </html>
      `;

      const { uri } =
        await Print.printToFileAsync({
          html: htmlContent
        });

      await Sharing.shareAsync(uri);

    } catch (error) {

      Alert.alert(
        'Error',
        'Could not generate PDF.'
      );
    }
  };

  /* =========================
  MAIN MENU
  ========================= */

  if (!hasStarted) {
    return (
      <View style={styles.menuContainer}>
        <StatusBar barStyle="light-content" />

        <Image
          source={{
            uri: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png'
          }}

          style={styles.menuLargeLogo}
        />

        <Text style={styles.menuTitle}>
          KODIGO
        </Text>

        <Text style={styles.menuSubtitle}>
          DANGAL AT HUSAY. BUMOTO NANG TAMA.
        </Text>

        <TouchableOpacity
          style={styles.enterButton}
          onPress={() =>
            setHasStarted(true)
          }
        >
          <Text style={styles.enterButtonText}>
            ENTER
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* =========================
  LOADING
  ========================= */

  if (isLoading) {
    return (
      <LinearGradient
        colors={COLORS.backgroundGradient}
        style={styles.container}
      >

        <AppHeader />

        <View style={styles.centerBox}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />

          <Text style={styles.loadingText}>
            Syncing Database...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  /* =========================
  RESULTS
  ========================= */

  if (isFinished || deck.length === 0) {

    const groupedKodigo =
      kodigo.reduce((acc, curr) => {

        const positionKey =
          curr.position
            ? curr.position
                .trim()
                .toUpperCase()
            : 'UNSPECIFIED';

        if (!acc[positionKey]) {
          acc[positionKey] = [];
        }

        acc[positionKey].push(curr);

        return acc;

      }, {});

    return (
      <LinearGradient
        colors={COLORS.backgroundGradient}
        style={styles.container}
      >

        <ScrollView
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
        >

          <Text style={styles.finalHeader}>
            OFFICIAL SELECTIONS
          </Text>

          {Object.keys(groupedKodigo).map(
            (position) => (
              <View
                key={position}
                style={styles.positionGroup}
              >

                <Text style={styles.groupTitle}>
                  {position}
                </Text>

                {groupedKodigo[position].map(
                  (c, i) => (

                    <View
                      key={i}
                      style={styles.resultTile}
                    >

                      <View
                        style={styles.resultTextCol}
                      >

                        <Text
                          style={
                            styles.resultTileName
                          }
                        >
                          {c.name}
                        </Text>

                        {c.party ? (
                          <Text
                            style={
                              styles.resultTileParty
                            }
                          >
                            {c.party}
                          </Text>
                        ) : null}

                      </View>

                      <View
                        style={
                          styles.checkmarkCircle
                        }
                      >
                        <Text
                          style={styles.checkmark}
                        >
                          ✓
                        </Text>
                      </View>
                    </View>
                  )
                )}
              </View>
            )
          )}
        </ScrollView>

        <View style={styles.actionRowResults}>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor:
                  COLORS.secondary
              }
            ]}
            onPress={exportToPDF}
          >
            <Text style={styles.actionBtnText}>
              EXPORT PDF
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor:
                  COLORS.primary
              }
            ]}
            onPress={handleRetry}
          >
            <Text style={styles.actionBtnText}>
              RESTART
            </Text>
          </TouchableOpacity>

        </View>

        <TouchableOpacity
          style={styles.tinyResetButton}
          onPress={handleForceReset}
        >
          <Text style={styles.tinyResetText}>
            Return to Main Menu
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  /* =========================
  MAIN SCREEN
  ========================= */

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient
        colors={COLORS.backgroundGradient}
        style={styles.container}
      >

        <StatusBar barStyle="dark-content" />

        <AppHeader />

        <View style={styles.swiperWrapper}>

          {deck
            .slice(0, 2)
            .reverse()
            .map((candidate, index, array) => (

              <SwipeableCard
                key={candidate.id}
                candidate={candidate}

                isTop={
                  index === array.length - 1
                }

                onSwipeRight={
                  handleSwipeRight
                }

                onSwipeLeft={
                  handleSwipeLeft
                }

                onOpenModal={
                  setSelectedCandidateForModal
                }
              />
            ))}

        </View>

        {/* UNDO BUTTON */}

        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[
              styles.undoButton,
              history.length === 0 && {
                opacity: 0.4
              }
            ]}

            disabled={history.length === 0}

            onPress={handleUndo}
          >
            <Text style={styles.undoButtonText}>
              ← UNDO
            </Text>
          </TouchableOpacity>
        </View>

        {/* MAIN MENU */}

        <TouchableOpacity
          style={styles.tinyResetButtonAbsolute}
          onPress={handleForceReset}
        >
          <Text
            style={
              styles.tinyResetTextAbsolute
            }
          >
            Return to Main Menu
          </Text>
        </TouchableOpacity>

        {/* MODAL */}

        <Modal
          visible={
            !!selectedCandidateForModal
          }

          animationType="slide"

          transparent={true}

          onRequestClose={() =>
            setSelectedCandidateForModal(
              null
            )
          }
        >

          {selectedCandidateForModal && (

            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>

                <ImageBackground
                  source={{
                    uri:
                      selectedCandidateForModal.image
                  }}

                  style={
                    styles.imageBackground
                  }
                >

                  <LinearGradient
                    colors={[
                      'rgba(0,0,0,0.7)',
                      'rgba(0,0,0,0.95)'
                    ]}

                    style={
                      styles.modalTextContainer
                    }
                  >

                    <Text style={styles.nameText}>
                      {
                        selectedCandidateForModal.name
                      }
                    </Text>

                    <ScrollView
                      style={
                        styles.expandedContent
                      }

                      showsVerticalScrollIndicator={
                        false
                      }
                    >

                      <Text
                        style={
                          styles.sectionTitle
                        }
                      >
                        CREDENTIALS
                      </Text>

                      <Text
                        style={
                          styles.detailText
                        }
                      >
                        {
                          selectedCandidateForModal.credentials ||
                          'No credentials provided.'
                        }
                      </Text>

                      <Text
                        style={
                          styles.sectionTitle
                        }
                      >
                        PLATFORM
                      </Text>

                      <Text
                        style={
                          styles.detailText
                        }
                      >
                        {
                          selectedCandidateForModal.platform ||
                          'No platform provided.'
                        }
                      </Text>
                    </ScrollView>

                    <TouchableOpacity
                      style={
                        styles.closeModalButton
                      }

                      onPress={() =>
                        setSelectedCandidateForModal(
                          null
                        )
                      }
                    >
                      <Text
                        style={
                          styles.dropdownButtonText
                        }
                      >
                        CLOSE PLATFORM
                      </Text>
                    </TouchableOpacity>

                  </LinearGradient>
                </ImageBackground>
              </View>
            </View>
          )}
        </Modal>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

/* =========================
STYLES
========================= */

const styles = StyleSheet.create({

  container: {
    flex: 1,

    paddingTop:
      Platform.OS === 'ios'
        ? 50
        : StatusBar.currentHeight + 10
  },

  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary
  },

  menuContainer: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },

  menuLargeLogo: {
    width: 140,
    height: 140,
    marginBottom: 20,
    tintColor: COLORS.accent
  },

  menuTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 4
  },

  menuSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 60,
    marginTop: -5,
    fontWeight: 'bold',
    letterSpacing: 2
  },

  enterButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    paddingHorizontal: 70,
    borderRadius: 4
  },

  enterButtonText: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2
  },

  headerContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.accent,
    elevation: 4
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  logoImage: {
    width: 28,
    height: 28,
    marginRight: 8
  },

  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2
  },

  headerSubtitle: {
    fontSize: 10,
    color: COLORS.secondary,
    marginTop: 2,
    fontWeight: 'bold'
  },

  swiperWrapper: {
    flex: 0.85,
    marginHorizontal: 25,
    marginVertical: 10,
    justifyContent: 'center'
  },

  card: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'white',
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.accent
  },

  imageBackground: {
    flex: 1,
    justifyContent: 'flex-end'
  },

  textContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30
  },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
    marginBottom: 8
  },

  badgeText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: 'bold'
  },

  nameText: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white'
  },

  positionText: {
    fontSize: 14,
    color: COLORS.accent,
    marginTop: 4,
    fontWeight: 'bold'
  },

  summaryText: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 8,
    lineHeight: 20
  },

  dropdownButton: {
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 4,
    marginTop: 15,
    borderWidth: 1,
    borderColor: COLORS.accent
  },

  dropdownButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1
  },

  overlayLabel: {
    position: 'absolute',
    top: 40,
    padding: 10,
    borderRadius: 4,
    zIndex: 110
  },

  swipeLabelText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900'
  },

  bottomControls: {
    alignItems: 'center',
    marginBottom: 80,
  },

  undoButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },

  undoButtonText: {
    color: COLORS.accent,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    fontSize: 15,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end'
  },

  modalCard: {
    width: '100%',
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden'
  },

  modalTextContainer: {
    padding: 25,
    flex: 1
  },

  expandedContent: {
    flex: 1,
    marginVertical: 15
  },

  sectionTitle: {
    color: COLORS.accent,
    fontWeight: 'bold',
    marginTop: 20,
    fontSize: 12,
    letterSpacing: 1
  },

  detailText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 8
  },

  closeModalButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 4,
    marginTop: 10
  },

  resultsList: {
    padding: 20
  },

  finalHeader: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2
  },

  positionGroup: {
    marginBottom: 10
  },

  groupTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginTop: 20,
    marginBottom: 10
  },

  resultTile: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 4,
    marginBottom: 8,
    alignItems: 'center',
    borderLeftWidth: 6,
    borderLeftColor: COLORS.secondary,
    elevation: 2
  },

  resultTextCol: {
    flex: 1
  },

  resultTileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark
  },

  resultTileParty: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
    marginTop: 4
  },

  checkmarkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center'
  },

  checkmark: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },

  actionRowResults: {
    flexDirection: 'row',
    padding: 20,
    gap: 15
  },

  actionBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 4,
    alignItems: 'center'
  },

  actionBtnText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 1
  },

  tinyResetButton: {
    paddingVertical: 10,
    paddingBottom: 40,
    alignItems: 'center'
  },

  tinyResetText: {
    color: COLORS.primary,
    fontSize: 13,
    textDecorationLine: 'underline',
    fontWeight: 'bold'
  },

  tinyResetButtonAbsolute: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center'
  },

  tinyResetTextAbsolute: {
    color: COLORS.primary,
    fontSize: 13,
    textDecorationLine: 'underline',
    fontWeight: 'bold'
  }
});