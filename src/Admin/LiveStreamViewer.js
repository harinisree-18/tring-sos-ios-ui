import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  NativeModules,
  Platform,
} from 'react-native';
import {RTCView, RTCPeerConnection} from 'react-native-webrtc';
import io from 'socket.io-client';
import theme from '../utils/theme';
import {SOCKET_URL} from '../components/config/axios';

const LiveStreamViewer = ({
  alertId,
  onClose,
  adminId = 'admin1',
  userName = '',
}) => {
  const [remoteStream, setRemoteStream] = useState(null);
  const [streamingEnded, setStreamingEnded] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const pendingAnswerRef = useRef(null);
  const isProcessingOfferRef = useRef(false);

  // Cleanup function
  const cleanupConnection = () => {
    if (socketRef.current) {
      console.log('[Admin] Cleaning up: disconnecting socket');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (peerConnectionRef.current) {
      console.log('[Admin] Cleaning up: closing peerConnection');
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    pendingAnswerRef.current = null;
    isProcessingOfferRef.current = false;
  };

  // Create a new peer connection with all event handlers
  const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        {urls: 'stun:stun.l.google.com:19302'},
        {urls: 'stun:stun1.l.google.com:19302'},
      ],
    });

    peerConnection.ontrack = event => {
      console.log('[Admin] Received remote stream:', event.streams[0]);
      setRemoteStream(event.streams[0]);
      setIsReconnecting(false);
    };

    peerConnection.onicecandidate = event => {
      if (event.candidate && socketRef.current) {
        console.log('[Admin] Sending ICE candidate:', event.candidate);
        socketRef.current.emit('ice-candidate', {
          room: alertId,
          candidate: event.candidate,
        });
      } else if (!event.candidate) {
        console.log('[Admin] ICE gathering complete');
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(
        '[Admin] PeerConnection state:',
        peerConnection.connectionState,
      );

      if (peerConnection.connectionState === 'failed') {
        console.log('[Admin] Connection failed, attempting to reconnect...');
        setIsReconnecting(true);
        // Wait a bit longer before requesting new offer
        setTimeout(() => {
          if (socketRef.current) {
            console.log(
              '[Admin] Requesting new offer after connection failure',
            );
            socketRef.current.emit('request-offer', {room: alertId});
          }
        }, 2000); // Increased delay to 2 seconds
      } else if (peerConnection.connectionState === 'connected') {
        console.log('[Admin] Connection established successfully');
        setIsReconnecting(false);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        '[Admin] ICEConnection state:',
        peerConnection.iceConnectionState,
      );
    };

    return peerConnection;
  };

  // Handle incoming offer
  const handleOffer = async offer => {
    if (isProcessingOfferRef.current) {
      console.log('[Admin] Already processing an offer, ignoring...');
      return;
    }

    isProcessingOfferRef.current = true;

    try {
      // Create new peer connection for reconnection
      if (peerConnectionRef.current) {
        console.log(
          '[Admin] Closing existing peer connection for reconnection',
        );
        peerConnectionRef.current.close();
        // Small delay to ensure proper cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;

      console.log('[Admin] Setting remote description with offer');
      await peerConnection.setRemoteDescription(offer);
      console.log(
        '[Admin] Remote description set, signaling state:',
        peerConnection.signalingState,
      );

      console.log('[Admin] Creating answer');
      const answer = await peerConnection.createAnswer();

      console.log('[Admin] Setting local description');
      await peerConnection.setLocalDescription(answer);
      console.log(
        '[Admin] Local description set, signaling state:',
        peerConnection.signalingState,
      );

      console.log('[Admin] Sending answer to employee');
      if (socketRef.current) {
        socketRef.current.emit('answer', {room: alertId, answer});
      }

      // Remove pending answer handling since we're restructuring the flow
      pendingAnswerRef.current = null;
    } catch (error) {
      console.error('[Admin] Error handling offer:', error);
      Alert.alert(
        'Connection Error',
        'Failed to establish connection. Please try again.',
      );
    } finally {
      isProcessingOfferRef.current = false;
    }
  };

  useEffect(() => {
    if (Platform.OS === 'android' && NativeModules.ScreenProtector) {
      NativeModules.ScreenProtector.activate();
    }
    console.log('[Admin] Connecting to signaling server...');
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: {
        token: 'dummy',
        userId: adminId,
        userName: userName || '',
        userType: 'admin',
      },
    });

    socketRef.current = socket;

    // Handle connection rejection
    socket.on('connection-rejected', ({reason}) => {
      console.log('[Admin] Connection rejected:', reason);
      Alert.alert(
        'Connection Error',
        'You already have an active viewing session. Please close other sessions first.',
        [
          {
            text: 'OK',
            onPress: () => {
              cleanupConnection();
              onClose();
            },
          },
        ],
      );
    });

    // Listen for streaming-status from backend
    socket.on('streaming-status', ({isStreaming}) => {
      console.log('[Admin] streaming-status event:', isStreaming);
      if (!isStreaming) {
        setStreamingEnded(true);
        Alert.alert('Streaming Ended', 'Streaming has already ended.');
        cleanupConnection();
        onClose();
      }
    });

    // Handle stream busy (another admin is already viewing)
    socket.on('stream-busy', ({reason}) => {
      console.log('[Admin] Stream busy:', reason);
      Alert.alert(
        'Stream Busy',
        reason || 'This stream is currently being viewed by another admin.',
        [
          {
            text: 'OK',
            onPress: () => {
              cleanupConnection();
              onClose();
            },
          },
        ],
      );
    });

    socket.on('connect', () => {
      console.log('[Admin] Socket.IO connected');
      socket.emit('join', alertId);
      console.log('[Admin] Emitted join:', alertId);

      // Check if streaming is active
      socket.emit('check-streaming', {room: alertId});
      console.log('[Admin] Emitted check-streaming:', alertId);

      // Request offer after a longer delay to ensure employee is ready
      setTimeout(() => {
        if (socketRef.current) {
          console.log('[Admin] Requesting initial offer');
          socketRef.current.emit('request-offer', {room: alertId});
        }
      }, 1500); // Increased delay to 1.5 seconds
    });

    socket.on('offer', ({offer}) => {
      console.log(
        '[Admin] Received offer, current signaling state:',
        peerConnectionRef.current?.signalingState,
      );
      handleOffer(offer);
    });

    // Remove answer handler since admin shouldn't receive answers
    socket.on('answer', ({answer}) => {
      console.log(
        '[Admin] Received unexpected answer - this should not happen:',
        answer,
      );
    });

    socket.on('ice-candidate', ({candidate}) => {
      console.log('[Admin] Received ICE candidate:', candidate);
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.addIceCandidate(candidate);
        } catch (error) {
          console.error('[Admin] Error adding ICE candidate:', error);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('[Admin] Socket disconnected');
      setIsReconnecting(true);
    });

    socket.on('reconnect', () => {
      console.log('[Admin] Socket reconnected');
      socket.emit('join', alertId);
      setTimeout(() => {
        socket.emit('request-offer', {room: alertId});
      }, 1000);
    });

    // Cleanup on unmount
    return () => {
      cleanupConnection();
      if (Platform.OS === 'android' && NativeModules.ScreenProtector) {
        NativeModules.ScreenProtector.deactivate();
      }
    };
  }, [alertId, adminId]);

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={() => {
        cleanupConnection();
        onClose();
      }}>
      <View style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              cleanupConnection();
              onClose();
            }}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>

          {streamingEnded ? (
            <Text style={styles.waitingText}>Streaming has already ended.</Text>
          ) : remoteStream ? (
            <RTCView streamURL={remoteStream.toURL()} style={styles.video} />
          ) : (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>
                {isReconnecting ? 'Reconnecting...' : 'Waiting for stream...'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    width: 320,
    height: 400,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    padding: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  video: {
    width: 280,
    height: 320,
    backgroundColor: '#000',
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    color: '#333',
    fontSize: 16,
    marginTop: 40,
  },
});

export default LiveStreamViewer;
