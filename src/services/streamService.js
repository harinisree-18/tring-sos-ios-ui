import { mediaDevices, RTCPeerConnection } from 'react-native-webrtc';
import io from 'socket.io-client';
import { SOCKET_URL } from '../components/config/axios';

let localStream = null;
let peerConnection = null;
let socket = null;
let isStreaming = false;
let currentAlertId = null;
let currentEmployeeId = null;
let isProcessingRequestOffer = false;

// Create a new peer connection with all event handlers
const createPeerConnection = () => {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  });

  pc.onicecandidate = event => {
    if (event.candidate && socket) {
      console.log('[Employee] Sending ICE candidate:', event.candidate);
      socket.emit('ice-candidate', {
        room: currentAlertId,
        candidate: event.candidate,
      });
    } else if (!event.candidate) {
      console.log('[Employee] ICE gathering complete');
    }
  };

  pc.onconnectionstatechange = () => {
    console.log('[Employee] PeerConnection state:', pc.connectionState);

    if (pc.connectionState === 'failed') {
      console.log(
        '[Employee] Connection failed, recreating peer connection...',
      );
      // Don't recreate here, let the request-offer handler do it
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[Employee] ICEConnection state:', pc.iceConnectionState);
  };

  pc.ontrack = event => {
    console.log('[Employee] ontrack event:', event);
  };

  return pc;
};

// Add tracks to peer connection
const addTracksToPC = pc => {
  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
      console.log('[Employee] Added track to peerConnection:', track.kind);
    });
  }
};

export const startStreaming = async (alertId, employeeId, constraints) => {
  try {
    currentAlertId = alertId;
    currentEmployeeId = employeeId;

    console.log('[Employee] Requesting user media...');
    localStream = await mediaDevices.getUserMedia(constraints);
    console.log('[Employee] Got local stream:', localStream);

    // Connect to signaling server using socket.io-client
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: {
        token: 'dummy',
        userId: employeeId,
        userType: 'employee',
      },
    });

    socket.on('connect', () => {
      console.log('[Employee] Socket.IO connected');
      socket.emit('join', alertId);

      // Create initial peer connection
      peerConnection = createPeerConnection();
      addTracksToPC(peerConnection);

      // Create and send initial offer
      peerConnection
        .createOffer()
        .then(offer => {
          return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
          console.log('[Employee] Created and set initial offer');
          socket.emit('offer', {
            room: alertId,
            offer: peerConnection.localDescription,
          });
        })
        .catch(error => {
          console.error('[Employee] Error creating initial offer:', error);
        });

      isStreaming = true;
    });

    socket.on('answer', async ({ answer }) => {
      console.log(
        '[Employee] Received answer, current signaling state:',
        peerConnection?.signalingState,
      );
      if (
        peerConnection &&
        peerConnection.signalingState === 'have-local-offer'
      ) {
        peerConnection
          .setRemoteDescription(answer)
          .then(() => {
            console.log(
              '[Employee] Successfully set remote description (answer)',
            );
          })
          .catch(error => {
            console.error(
              '[Employee] Error setting remote description:',
              error,
            );
          });
      } else {
        console.warn(
          '[Employee] Cannot set answer, peer connection not in correct state:',
          peerConnection?.signalingState,
        );
        // If we're in stable state, it means we need to wait for a new offer
        if (peerConnection?.signalingState === 'stable') {
          console.log(
            '[Employee] Peer connection in stable state, might need new offer-answer cycle',
          );
          try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', {
              room: currentAlertId,
              offer: peerConnection.localDescription,
            });
          } catch (error) {
            console.error('[Employee] Error creating new offer:', error);
          }
        }
      }
    });

    socket.on('ice-candidate', ({ candidate }) => {
      console.log('[Employee] Received ICE candidate:', candidate);
      if (peerConnection) {
        try {
          peerConnection.addIceCandidate(candidate);
        } catch (error) {
          console.error('[Employee] Error adding ICE candidate:', error);
        }
      }
    });

    socket.on('request-offer', async ({ room }) => {
      if (isProcessingRequestOffer) {
        console.log('[Employee] Already processing request-offer, ignoring...');
        return;
      }

      if (room === currentAlertId && isStreaming && localStream) {
        console.log('[Employee] Received request-offer, creating new offer');
        isProcessingRequestOffer = true;

        try {
          // Clean up old peer connection
          if (peerConnection) {
            try {
              peerConnection.close();
              console.log('[Employee] Closed old peerConnection');
            } catch (e) {
              console.warn('[Employee] Error closing old peerConnection:', e);
            }
          }

          // Add a small delay to ensure proper cleanup
          await new Promise(resolve => setTimeout(resolve, 100));

          // Create new peer connection
          peerConnection = createPeerConnection();
          addTracksToPC(peerConnection);

          // Create and send new offer
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          console.log(
            '[Employee] Created and set new offer for reconnection, signaling state:',
            peerConnection.signalingState,
          );
          socket.emit('offer', { room: currentAlertId, offer });
        } catch (error) {
          console.error(
            '[Employee] Error during request-offer handling:',
            error,
          );
        } finally {
          isProcessingRequestOffer = false;
        }
      } else {
        console.log(
          '[Employee] Received request-offer, but not currently streaming or no local stream',
        );
      }
    });

    socket.on('disconnect', () => {
      console.log('[Employee] Socket disconnected');
    });

    socket.on('reconnect', () => {
      console.log('[Employee] Socket reconnected');
      socket.emit('join', alertId);
    });
  } catch (error) {
    console.error('[Employee] Error starting stream:', error);
    throw error;
  }
};

export const stopStreaming = () => {
  console.log('[Employee] Stopping stream...');

  isStreaming = false;
  isProcessingRequestOffer = false;

  if (peerConnection) {
    try {
      peerConnection.close();
      console.log('[Employee] Closed peer connection');
    } catch (error) {
      console.warn('[Employee] Error closing peer connection:', error);
    }
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach(track => {
      try {
        track.stop();
        console.log('[Employee] Stopped track:', track.kind);
      } catch (error) {
        console.warn('[Employee] Error stopping track:', error);
      }
    });
    localStream = null;
  }

  if (socket) {
    try {
      socket.disconnect();
      console.log('[Employee] Disconnected socket');
    } catch (error) {
      console.warn('[Employee] Error disconnecting socket:', error);
    }
    socket = null;
  }

  currentAlertId = null;
  currentEmployeeId = null;
};

export const getIsStreaming = () => isStreaming;
export const isCurrentlyStreaming = () => isStreaming;
