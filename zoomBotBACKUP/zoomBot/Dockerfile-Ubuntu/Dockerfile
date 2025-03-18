# Use the official Ubuntu image as the base image
FROM ubuntu:22.04

# Install necessary dependencies
RUN apt-get update && \
    apt-get install -y build-essential cmake

RUN apt-get install -y pkgconf


RUN apt-get update && apt-get install -y --no-install-recommends --no-install-suggests \
    libx11-xcb1 \
    libxcb-xfixes0 \
    libxcb-shape0 \
    libxcb-shm0 \
    libxcb-randr0 \
    libxcb-image0 \
    libxcb-keysyms1 \
    libxcb-xtest0 \
    libdbus-1-3 \
    libglib2.0-0 \
    libgbm1 \
    libxfixes3 \
    libgl1 \
    libdrm2 \
    libgssapi-krb5-2 \
    openssl \
    ca-certificates \
    pkg-config \
    libegl-mesa0 \
    libsdl2-dev \
    g++-multilib 


# Add these for audio processing and websocket dependencies
RUN apt-get update && apt-get install -y \
    libboost-all-dev \
    libboost-system-dev \
    && rm -rf /var/lib/apt/lists/* 
    
# Install CURL related libs
RUN apt-get update && apt-get install -y libcurl4-openssl-dev

# Install ALSA
RUN apt-get update && apt-get install -y libasound2 libasound2-plugins alsa alsa-utils alsa-oss

# Install Pulseaudio
RUN apt-get update && apt-get install -y pulseaudio pulseaudio-utils

# Install git for cloning websocketpp
RUN apt-get update && apt-get install -y git

# Clone and install websocketpp
RUN cd /tmp && \
    git clone https://github.com/zaphoyd/websocketpp.git && \
    cd websocketpp && \
    mkdir build && \
    cd build && \
    cmake .. && \
    make install && \
    cd / && \
    rm -rf /tmp/websocketpp

# Set the working directory
WORKDIR /app

# Copy your application files to the container
COPY demo/ /app/demo/

# Execute additional commands
RUN cd /app/demo && rm -rf bin && rm -rf build && cmake -B build && cd build && make

# Set the working directory to the source folder
WORKDIR /app/demo

# Make the run script executable
RUN chmod +x /app/demo/setup-pulseaudio.sh

# Set the working directory to the binary folder
WORKDIR /app/demo/bin

# Create a directory for external config
RUN mkdir -p /external-config

# Create a wrapper script to handle external config
RUN echo '#!/bin/bash' > /app/demo/config-wrapper.sh \
    && echo 'if [ -f "/external-config/config.txt" ]; then' >> /app/demo/config-wrapper.sh \
    && echo '  echo "External config found - copying to both locations"' >> /app/demo/config-wrapper.sh \
    && echo '  cp /external-config/config.txt /app/demo/config.txt' >> /app/demo/config-wrapper.sh \
    && echo '  cp /external-config/config.txt /app/demo/bin/config.txt' >> /app/demo/config-wrapper.sh \
    && echo '  echo "External config copied successfully"' >> /app/demo/config-wrapper.sh \
    && echo '  cat /app/demo/bin/config.txt' >> /app/demo/config-wrapper.sh \
    && echo 'else' >> /app/demo/config-wrapper.sh \
    && echo '  echo "No external config found - using default"' >> /app/demo/config-wrapper.sh \
    && echo 'fi' >> /app/demo/config-wrapper.sh \
    && echo '' >> /app/demo/config-wrapper.sh \
    && echo '# Run the pulseaudio setup and start the meeting SDK' >> /app/demo/config-wrapper.sh \
    && echo '/app/demo/setup-pulseaudio.sh' >> /app/demo/config-wrapper.sh \
    && echo './meetingSDKDemo' >> /app/demo/config-wrapper.sh

# Make the wrapper script executable
RUN chmod +x /app/demo/config-wrapper.sh

# Specify the wrapper script as the CMD
CMD ["/app/demo/config-wrapper.sh"]