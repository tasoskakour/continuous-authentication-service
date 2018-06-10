"""This file is used to establish a connection of data between python and node.js"""
import json
import sys


def send_to_node(data):
    """Is used to send data as json to nodejs"""
    message = {'data': data}
    print json.JSONEncoder().encode(message)  # pylint: disable = E1601


def receive_from_node():
    """Is used to receive data from node.js via stdin decoded as json"""
    for i in sys.stdin:
        data = i
    data = json.JSONDecoder().decode(data)
    return data
