import { View, Text, StyleSheet } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { useState, useEffect, useCallback } from 'react'
import { AVPlaybackStatus, Audio } from 'expo-av'
import { Sound } from 'expo-av/build/Audio'
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'

export type Memo = {
  uri: string // audio file uri
  metering: number[] // dB array
}

/**
 * Component to display an audio record item
 */
const MemoItem = ({ memo }: { memo: Memo }) => {
  const [sound, setSound] = useState<Sound>()
  const [status, setStatus] = useState<AVPlaybackStatus>()

  /**
   * Load the audio file
   */
  async function loadSound() {
    const { sound } = await Audio.Sound.createAsync(
      { uri: memo.uri },
      { progressUpdateIntervalMillis: 1000 / 60 },
      onPlaybackStatusUpdate
    )
    setSound(sound)
  }

  /**
   * Callback to update the playback status
   */
  const onPlaybackStatusUpdate = useCallback(
    async (newStatus: AVPlaybackStatus) => {
      setStatus(newStatus)

      if (!newStatus.isLoaded || !sound) {
        return
      }

      if (newStatus.didJustFinish) {
        await sound?.setPositionAsync(0)
      }
    },
    [sound]
  )

  useEffect(() => {
    loadSound()
  }, [memo])

  /**
   * Play or pause the audio
   */
  const playSound = useCallback(async () => {
    if (!sound) {
      return
    }
    if (status?.isLoaded && status.isPlaying) {
      await sound.pauseAsync()
    } else {
      await sound.replayAsync()
    }
  }, [sound, status])

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync()
        }
      : undefined
  }, [sound])

  /**
   * Format milliseconds to minutes:seconds
   */
  const formatMillis = (millis: number) => {
    const minutes = Math.floor(millis / (1000 * 60))
    const seconds = Math.floor((millis % (1000 * 60)) / 1000)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  const isPlaying = status?.isLoaded ? status.isPlaying : false
  const position = status?.isLoaded ? status.positionMillis : 0
  const duration = status?.isLoaded ? status.durationMillis : 1

  const progress = position / (duration ?? 1)

  /**
   * Animated style for the playback blue dot indicator
   */
  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    left: `${progress * 100}%`,
    // withTiming(`${progress * 100}%`, {
    //   duration:
    //     (status?.isLoaded && status.progressUpdateIntervalMillis) || 100,
    // }),
  }))

  // Compress or expand the audio waveform to fit the playback duration
  let numLines = 50
  let lines = []

  for (let i = 0; i < numLines; i++) {
    const meteringIndex = Math.floor((i * memo.metering.length) / numLines)
    const nextMeteringIndex = Math.ceil(
      ((i + 1) * memo.metering.length) / numLines
    )
    const values = memo.metering.slice(meteringIndex, nextMeteringIndex)
    const average = values.reduce((sum, a) => sum + a, 0) / values.length
    // lines.push(memo.metering[meteringIndex]);
    lines.push(average)
  }

  // Fix the wave line height NaN issue
  const waveLineHeight = (db: number) => {
    const height = interpolate(
      db,
      [-60, 0],
      [5, 50],
      Extrapolation.CLAMP
    )
    return isNaN(height) ? 5 : height
  }

  const isValidLine = (db: any) => typeof db === 'number' && !isNaN(db)

  return (
    <View style={styles.container}>
      <FontAwesome5
        onPress={playSound}
        name={isPlaying ? 'pause' : 'play'}
        size={20}
        color={'gray'}
      />

      <View style={styles.playbackContainer}>
        <View style={styles.wave}>
          {lines.map((db, index) => (
            <View
              key={index}
              style={[
                styles.waveLine,
                {
                  height: isValidLine(db) ? waveLineHeight(db) : 5,
                  backgroundColor:
                    progress > index / lines.length ? 'royalblue' : 'gainsboro',
                },
              ]}
            />
          ))}
        </View>

        <Text
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            color: 'gray',
            fontFamily: 'Inter',
            fontSize: 12,
          }}
        >
          {formatMillis(position || 0)} / {formatMillis(duration || 0)}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 15,

    // shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,

    elevation: 3,
  },
  playbackContainer: {
    flex: 1,
    height: 80,
    justifyContent: 'center',
  },
  playbackBackground: {
    height: 3,
    backgroundColor: 'gainsboro',
    borderRadius: 5,
  },
  playbackIndicator: {
    width: 10,
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: 'royalblue',
    position: 'absolute',
  },
  wave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveLine: {
    flex: 1,
    height: 30,
    backgroundColor: 'gainsboro',
    borderRadius: 20,
  },
})

export default MemoItem
